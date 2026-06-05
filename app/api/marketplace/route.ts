import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";

const SORT_MAP: Record<string, string> = {
  popular:   "cm.sales_count DESC",
  newest:    "cm.listed_at DESC",
  price:     "cm.price ASC",
  price_asc: "cm.price ASC",
  price_desc:"cm.price DESC",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sort   = searchParams.get("sort") ?? "popular";
  const tag    = searchParams.get("tag")?.trim() || null;

  const orderBy = SORT_MAP[sort] ?? SORT_MAP.popular;

  try {
    let sql: string;
    let params: unknown[] = [];

    if (tag) {
      sql = `
        SELECT c.id, c.name, c.display_name, c.persona, c.display_description, c.avatar, c.tier,
               c.is_verified, c.is_official,
               cm.price, cm.sales_count, cm.tags,
               u.name as creator_name, cm.listed_at
        FROM character_marketplace cm
        JOIN characters c ON c.id = cm.character_id
        JOIN users u ON u.id = cm.creator_id
        WHERE cm.status = 'active'
          AND cm.tags @> ARRAY[$1]::text[]
        ORDER BY ${orderBy}
        LIMIT 50
      `;
      params = [tag];
    } else {
      sql = `
        SELECT c.id, c.name, c.display_name, c.persona, c.display_description, c.avatar, c.tier,
               c.is_verified, c.is_official,
               cm.price, cm.sales_count, cm.tags,
               u.name as creator_name, cm.listed_at
        FROM character_marketplace cm
        JOIN characters c ON c.id = cm.character_id
        JOIN users u ON u.id = cm.creator_id
        WHERE cm.status = 'active'
        ORDER BY ${orderBy}
        LIMIT 50
      `;
    }

    const rows = await query<{
      id: string; name: string; display_name: string; persona: string; display_description: string; avatar: string;
      tier: string; price: number; sales_count: number;
      creator_name: string; listed_at: string;
      tags: string[] | null;
      is_verified: boolean; is_official: boolean;
    }>(sql, params);

    return NextResponse.json({
      characters: rows.map((r) => ({
        id: r.id,
        name: r.name,
        displayName: r.display_name || r.name,
        persona: r.persona,
        displayDescription: r.display_description || r.persona,
        avatar: r.avatar,
        tier: r.tier,
        price: r.price,
        salesCount: r.sales_count,
        creatorName: r.creator_name,
        listedAt: r.listed_at,
        tags: r.tags ?? [],
        verified: r.is_verified,
        official: r.is_official,
      })),
    });
  } catch (err) {
    console.error("Marketplace list error:", err);
    return NextResponse.json({ characters: [] });
  }
}