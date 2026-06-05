import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { queryOne, query } from "@/lib/db/pool";

export async function GET() {
  try {
    const auth = await requireAuth();
    const row = await queryOne(
      "SELECT openai_base_url, anthropic_base_url, openai_api_key, anthropic_api_key, updated_at FROM user_api_settings WHERE user_id = $1",
      [auth.userId]
    );
    return NextResponse.json({
      isVip: auth.user.isVip || false,
      apiSettings: row ? {
        openai_base_url: row["openai_base_url"] || "",
        anthropic_base_url: row["anthropic_base_url"] || "",
      } : null,
    });
  } catch {
    return NextResponse.json({ isVip: false, apiSettings: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.user.isVip) {
      return NextResponse.json({ error: "VIP 会员无需手动配置 API" }, { status: 400 });
    }
    const body = await req.json();
    await query(
      `INSERT INTO user_api_settings (user_id, openai_base_url, anthropic_base_url, openai_api_key, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (user_id) DO UPDATE SET
         openai_base_url = EXCLUDED.openai_base_url,
         anthropic_base_url = EXCLUDED.anthropic_base_url,
         anthropic_api_key = EXCLUDED.api_key_encrypted,
         updated_at = now()`,
      [auth.userId, body.openai_base_url || "", body.anthropic_base_url || "", body.openai_api_key || "", body.anthropic_api_key || ""]
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Settings save error:", e);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
