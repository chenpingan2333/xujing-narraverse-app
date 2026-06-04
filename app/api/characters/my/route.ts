import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { query } from "@/lib/db/pool";

export async function GET(req: NextRequest) {
  try {
    const authCtx = await requireAuth();
    const userId = authCtx.userId;

    const rows = await query<{
      id: string; name: string; persona: string; tier: string;
      avatar: string; is_listed: boolean; created_at: string;
    }>(
      "SELECT id, name, persona, tier, avatar, is_listed, created_at FROM characters WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );

    return NextResponse.json({ characters: rows });
  } catch {
    return NextResponse.json({ characters: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCtx = await requireAuth();
    const userId = authCtx.userId;
    const body = await req.json();
    const { characterId, price, action } = body;

    if (action === "list") {
      if (![490, 990, 1990].includes(price)) {
        return NextResponse.json({ error: "价格只能是 490、990 或 1990 星钻" }, { status: 400 });
      }

      const char = await query(
        "SELECT id FROM characters WHERE id = $1 AND user_id = $2",
        [characterId, userId]
      );
      if (!char.length) {
        return NextResponse.json({ error: "角色不存在" }, { status: 404 });
      }

      await query(
        "INSERT INTO character_marketplace (character_id, creator_id, price, status) VALUES ($1, $2, $3, 'active') ON CONFLICT (character_id) DO UPDATE SET price = $3, status = 'active', updated_at = now()",
        [characterId, userId, price]
      );

      await query(
        "UPDATE characters SET is_listed = true WHERE id = $1",
        [characterId]
      );

      return NextResponse.json({ success: true });
    }

    if (action === "delist") {
      await query(
        "UPDATE character_marketplace SET status = 'delisted', updated_at = now() WHERE character_id = $1 AND creator_id = $2",
        [characterId, userId]
      );
      await query(
        "UPDATE characters SET is_listed = false WHERE id = $1",
        [characterId]
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "无效操作" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
