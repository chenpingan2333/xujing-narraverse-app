import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db/pool";
import { verifyPassword } from "@/lib/auth/crypto";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { withErrorHandler, safeError } from "@/lib/api/error-handler";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { email, password } = await req.json();

  if (!email || !password) return safeError("请填写邮箱和密码", 400);

  const user = await queryOne<{ id: string; email: string; password_hash: string | null }>(
    `SELECT u.id, u.email, ap.password_hash
     FROM users u
     JOIN auth_providers ap ON ap.user_id = u.id AND ap.provider = 'email' AND ap.email = $1
     WHERE u.is_banned = false`,
    [email.trim().toLowerCase()]
  );

  if (!user || !user.password_hash) {
    return safeError("邮箱或密码错误", 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return safeError("邮箱或密码错误", 401);

  const token = await createSession(user.id);
  await setSessionCookie(token);

  return NextResponse.json({ success: true, redirect: "/chat" });
});