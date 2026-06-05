import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const chars = await query(
      "SELECT id, name, display_name, persona, avatar, rarity, price_star FROM characters WHERE world_id = $1 AND is_active = true ORDER BY rarity, name",
      [id]
    );
    return NextResponse.json({ characters: chars });
  } catch {
    return NextResponse.json({ characters: [] });
  }
}
