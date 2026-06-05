import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { queryOne, query } from "@/lib/db/pool";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;

    const existing = await queryOne(
      "SELECT * FROM characters WHERE id = $1 AND (is_official = true OR user_id = $2)",
      [id, userId]
    );
    if (!existing) return NextResponse.json({ error: "角色不存在或无权复制" }, { status: 404 });

    const row = await queryOne(
      `INSERT INTO characters (
        user_id, name, persona, description, tier, avatar,
        speech_style, background, greeting, taboos,
        rarity, price_star, opening_message, relationship_guide,
        world_view, story_nodes, is_verified, is_official
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, false, false
      ) RETURNING *`,
      [
        userId,
        existing["name"] + " (副本)",
        existing["persona"], existing["description"], existing["tier"], existing["avatar"],
        existing["speech_style"], existing["background"], existing["greeting"], existing["taboos"],
        existing["rarity"] ?? "normal", existing["price_star"] ?? 0,
        existing["opening_message"], existing["relationship_guide"],
        existing["world_view"], existing["story_nodes"],
      ]
    );

    return NextResponse.json({ character: row }, { status: 201 });
  } catch (e) {
    console.error("Copy character error:", e);
    return NextResponse.json({ error: "复制失败" }, { status: 500 });
  }
}