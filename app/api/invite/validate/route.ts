import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db/pool";
import { requireAuth } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/auth/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const rl = checkRateLimit("invite-validate:" + ctx.userId, 10, 5 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "请求过于频繁，请稍后再试" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
      );
    }
    const body = await req.json();
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code || code.length < 4 || code.length > 32) {
      return NextResponse.json({ valid: false });
    }
    const invite = await queryOne<{ id: string }>(
      "SELECT id FROM invite_codes WHERE code = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > now()) AND use_count < max_uses",
      [code],
    );
    return NextResponse.json({ valid: !!invite });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      return NextResponse.json({ error: (err as { message: string }).message }, { status: 401 });
    }
    return NextResponse.json({ error: "验证失败" }, { status: 500 });
  }
}