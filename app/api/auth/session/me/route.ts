import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";

export async function GET() {
  try {
    const ctx = await requireAuth();
    return NextResponse.json({ user: ctx.user });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      const authErr = err as { code: string; message: string };
      return NextResponse.json({ error: authErr.message }, { status: 401 });
    }
    return NextResponse.json({ error: "服务异常" }, { status: 500 });
  }
}