import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db/pool";
import { sha256, hashPassword } from "@/lib/auth/crypto";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { OTP_MAX_ATTEMPTS } from "@/features/narraverse/auth/types";
import { z } from "zod";

const RegisterRequest = z.object({
  email: z.string().email("邮箱格式不正确"),
  code: z.string().length(6).regex(/^\d+$/, "验证码格式不正确"),
  password: z.string().min(6, "密码至少6位").max(128),
  confirmPassword: z.string(),
  inviteCode: z.string().min(4, "邀请码格式不正确").max(32),
}).refine((d) => d.password === d.confirmPassword, {
  message: "两次密码不一致",
  path: ["confirmPassword"],
});

export async function POST(req: NextRequest) {
  try {
    const body = RegisterRequest.parse(await req.json());
    const { email, code, password, inviteCode } = body;
    const codeHash = sha256(code);

    // 1. Validate OTP
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

    // 2. Check email not already registered
    const existingEmail = await queryOne<{ id: string }>(
      `SELECT u.id FROM users u
       JOIN auth_providers ap ON ap.user_id = u.id AND ap.provider = 'email' AND ap.email = $1`,
      [email],
    );
    if (existingEmail) {
      return NextResponse.json({ error: "该邮箱已注册，请直接登录" }, { status: 409 });
    }

    // 3. Validate and redeem invite code (atomic)
    const invite = await queryOne<{ id: string; type: string }>(
      `SELECT id, type FROM invite_codes
       WHERE code = $1 AND is_active = true
       AND (expires_at IS NULL OR expires_at > now())
       AND use_count < max_uses
       FOR UPDATE`,
      [inviteCode],
    );

    if (!invite) {
      // Brief delay to slow down brute-force
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
      return NextResponse.json({ error: "邀请码无效或已用完" }, { status: 400 });
    }

    // 4. All valid — begin registration
    // Mark OTP as used
    await query(`UPDATE email_otps SET used = true WHERE id = $1`, [otp.id]);

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userRow = await queryOne<{ id: string }>(
      `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id`,
      [email, email.split("@")[0]],
    );
    if (!userRow) {
      return NextResponse.json({ error: "注册失败，请重试" }, { status: 500 });
    }
    const userId = userRow.id;

    // Create auth_provider with password_hash
    await query(
      `INSERT INTO auth_providers (user_id, provider, email, password_hash)
       VALUES ($1, 'email', $2, $3)
       ON CONFLICT (provider, email) DO NOTHING`,
      [userId, email, passwordHash],
    );

    // Redeem invite code
    await query(
      "UPDATE invite_codes SET use_count = use_count + 1 WHERE id = $1 AND use_count < max_uses",
      [invite.id],
    );
    await query(
      "INSERT INTO invite_usage (invite_code_id, used_by) VALUES ($1, $2)",
      [invite.id, userId],
    );

    // Create session
    const token = await createSession(userId);
    await setSessionCookie(token);

    return NextResponse.json({
      message: "注册成功",
      userId,
      invited: true,
      inviteType: invite.type,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      const zodErr = err as { errors?: { message: string }[] };
      const firstMsg = zodErr.errors?.[0]?.message ?? "请求参数不正确";
      return NextResponse.json({ error: firstMsg }, { status: 400 });
    }
    console.error(
      "Register error:",
      err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
    );
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 });
  }
}