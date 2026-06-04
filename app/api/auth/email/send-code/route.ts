import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db/pool";
import { sha256, generateOtp } from "@/lib/auth/crypto";
import { sendEmail, isResendConfigured } from "@/lib/email/resend";
import { SendCodeRequest, OTP_COOLDOWN_MS, OTP_TTL_MS } from "@/features/narraverse/auth/types";

export async function POST(req: NextRequest) {
  try {
    const body = SendCodeRequest.parse(await req.json());
    const { email } = body;

    // Check cooldown (30s)
    const recent = await queryOne<{ created_at: string }>(
      `SELECT created_at FROM email_otps
       WHERE email = $1
       AND created_at > now() - interval '30 seconds'
       ORDER BY created_at DESC LIMIT 1`,
      [email],
    );
    if (recent) {
      const elapsed = Date.now() - new Date(recent.created_at).getTime();
      const remaining = Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json(
        { error: `请${remaining}秒后再试` },
        { status: 429, headers: { "Retry-After": String(Math.max(1, remaining)) } },
      );
    }

    // Lock out if too many recent attempts
    const recentAttempts = await queryOne<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM email_otps
       WHERE email = $1 AND created_at > now() - interval '15 minutes'`,
      [email],
    );
    if (recentAttempts && parseInt(recentAttempts.total, 10) >= 10) {
      return NextResponse.json(
        { error: "请求过于频繁，请15分钟后再试" },
        { status: 429 },
      );
    }

    const code = generateOtp();
    const codeHash = sha256(code);

    await query(
      `INSERT INTO email_otps (email, code_hash, expires_at)
       VALUES ($1, $2, now() + interval '10 minutes')`,
      [email, codeHash],
    );

    // Send email via Resend
    if (isResendConfigured()) {
      try {
        const result = await sendEmail({
          to: email,
          subject: "【叙境】邮箱验证码",
          text: `您的验证码是 ${code}\n5分钟内有效。\n\n— 叙境`,
        });
        console.log(`[Resend] OTP sent to ${email}, id: ${result.id}`);
      } catch (emailErr) {
        console.error(
          "[Resend] send error:",
          emailErr instanceof Error ? emailErr.message.slice(0, 200) : String(emailErr).slice(0, 200),
        );
        // Still return success — OTP is stored in DB, user can retry or use dev fallback
        return NextResponse.json({ message: "验证码已发送" });
      }
    } else {
      // Dev fallback: log to console
      console.log(`[OTP] DEV — Code for ${email}: ${code}`);
    }

    return NextResponse.json({ message: "验证码已发送" });
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
    }
    console.error("[Send OTP] error:", err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200));
    return NextResponse.json({ error: "发送失败，请稍后重试" }, { status: 500 });
  }
}
