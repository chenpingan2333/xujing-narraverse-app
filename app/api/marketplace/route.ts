import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sort = searchParams.get("sort") ?? "popular";

  let orderBy = "cm.sales_count DESC";
  if (sort === "newest") orderBy = "cm.listed_at DESC";
  if (sort === "price") orderBy = "cm.price ASC";

  try {
    const rows = await query<{
      id: string; name: string; persona: string; avatar: string;
      tier: string; price: number; sales_count: number;
      creator_name: string; listed_at: string;
    }>(
      "SELECT c.id, c.name, c.persona, c.avatar, c.tier, cm.price, cm.sales_count, u.name as creator_name, cm.listed_at FROM character_marketplace cm JOIN characters c ON c.id = cm.character_id JOIN users u ON u.id = cm.creator_id WHERE cm.status = 'active' ORDER BY " + orderBy + " LIMIT 50"
    );

    return NextResponse.json({
      characters: rows.map((r) => ({
        id: r.id,
        name: r.name,
        persona: r.persona,
        avatar: r.avatar,
        tier: r.tier,
        price: r.price,
        salesCount: r.sales_count,
        creatorName: r.creator_name,
        listedAt: r.listed_at,
      })),
    });
  } catch (err) {
    console.error("Marketplace list error:", err);
    return NextResponse.json({ characters: [] });
  }
}
