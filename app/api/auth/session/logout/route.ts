import { NextResponse } from "next/server";
import { destroySession, getSessionToken, clearSessionCookie } from "@/lib/auth/session";

export async function POST() {
  const token = await getSessionToken();
  if (token) {
    await destroySession(token);
    await clearSessionCookie();
  }
  return NextResponse.json({ message: "已退出登录" });
}