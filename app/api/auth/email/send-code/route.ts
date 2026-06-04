import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db/pool";
import { sha256, generateOtp } from "@/lib/auth/crypto";
import { sendEmail } from "@/lib/email/smtp";
import { SendCodeRequest, OTP_COOLDOWN_MS, OTP_TTL_MS } from "@/features/narraverse/auth/types";

const SMTP_HOST = process.env["SMTP_HOST"] ?? "";
const SMTP_PORT = parseInt(process.env["SMTP_PORT"] ?? "465", 10);
const SMTP_USER = process.env["SMTP_USER"] ?? "";
const SMTP_PASS = process.env["SMTP_PASS"] ?? "";
const SMTP_FROM = process.env["SMTP_FROM"] ?? SMTP_USER;

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

    // Send email via QQ SMTP
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      try {
        await sendEmail({
          host: SMTP_HOST,
          port: SMTP_PORT,
          user: SMTP_USER,
          pass: SMTP_PASS,
          from: SMTP_FROM,
          to: email,
          subject: "叙境 — 验证码",
          text: `你的验证码是：${code}\n\n10分钟内有效。\n\n— 叙境`,
        });
      } catch (smtpErr) {
        // Log but don't expose SMTP details to client
        console.error(
          "SMTP send error:",
          smtpErr instanceof Error ? smtpErr.message.slice(0, 200) : String(smtpErr).slice(0, 200),
        );
        // Fall through — still return success if OTP was stored
      }
    } else {
      // Dev fallback: log to console
      console.log(`[OTP] Code for ${email}: ${code}`);
    }

    return NextResponse.json({ message: "验证码已发送" });
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
    }
    console.error("Send OTP error:", err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200));
    return NextResponse.json({ error: "发送失败，请稍后重试" }, { status: 500 });
  }
}
