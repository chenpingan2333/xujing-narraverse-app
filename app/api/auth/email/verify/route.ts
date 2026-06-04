import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db/pool";
import { sha256 } from "@/lib/auth/crypto";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { inviteService } from "@/features/narraverse/auth/invite.service";
import { VerifyCodeRequest, OTP_MAX_ATTEMPTS } from "@/features/narraverse/auth/types";

export async function POST(req: NextRequest) {
  try {
    const body = VerifyCodeRequest.parse(await req.json());
    const { email, code } = body;
    const codeHash = sha256(code);

    // Find valid, unused OTP
    const otp = await queryOne<{ id: string; attempt_count: number }>(
      `SELECT id, attempt_count FROM email_otps
       WHERE email = $1 AND code_hash = $2 AND expires_at > now() AND used = false
       ORDER BY created_at DESC LIMIT 1`,
      [email, codeHash],
    );

    if (!otp) {
      await query(
        `UPDATE email_otps SET attempt_count = attempt_count + 1
         WHERE email = $1 AND used = false AND expires_at > now()
         AND id = (SELECT id FROM email_otps WHERE email = $1 AND used = false AND expires_at > now() ORDER BY created_at DESC LIMIT 1)`,
        [email],
      );
      return NextResponse.json({ error: "验证码错误或已过期" }, { status: 401 });
    }

    if (otp.attempt_count >= OTP_MAX_ATTEMPTS) {
      return NextResponse.json({ error: "验证码尝试次数过多，请重新获取" }, { status: 429 });
    }

    // Mark OTP as used
    await query(`UPDATE email_otps SET used = true WHERE id = $1`, [otp.id]);

    // Find or create user
    const existing = await queryOne<{ id: string; name: string }>(
      `SELECT u.id, u.name FROM users u
       JOIN auth_providers ap ON ap.user_id = u.id AND ap.provider = 'email' AND ap.email = $1`,
      [email],
    );

    let userId: string;

    if (existing) {
      userId = existing.id;
    } else {
      const userRow = await queryOne<{ id: string }>(
        `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id`,
        [email, email.split("@")[0]],
      );
      userId = userRow!.id;

      await query(
        `INSERT INTO auth_providers (user_id, provider, email)
         VALUES ($1, 'email', $2)
         ON CONFLICT (provider, email) DO NOTHING`,
        [userId, email],
      );
    }

    const token = await createSession(userId);
    await setSessionCookie(token);

    // Return invite status so frontend can route correctly
    const inviteStatus = await inviteService.getStatus(userId);

    return NextResponse.json({
      message: "登录成功",
      userId,
      invited: inviteStatus.invited,
      inviteType: inviteStatus.type,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "验证码格式不正确" }, { status: 400 });
    }
    console.error("Verify OTP error:", err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200));
    return NextResponse.json({ error: "验证失败，请稍后重试" }, { status: 500 });
  }
}
