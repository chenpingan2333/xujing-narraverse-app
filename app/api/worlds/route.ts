import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    if (id) {
      const world = await query(
        "SELECT * FROM official_worlds WHERE id = $1",
        [id]
      );
      if (world.length === 0) return NextResponse.json({ error: "不存在" }, { status: 404 });

      // Get characters bound to this world
      const chars = await query(
        "SELECT id, name, display_name, persona, avatar, rarity FROM characters WHERE world_id = $1 AND is_active = true",
        [id]
      );
      return NextResponse.json({ world: world[0], characters: chars });
    }

    const rows = await query(
      "SELECT id, name, display_name, description, world_type, cover_image, is_official, created_at FROM official_worlds ORDER BY created_at DESC LIMIT 50"
    );
    return NextResponse.json({ worlds: rows });
  } catch (e) {
    console.error("Worlds list error:", e);
    return NextResponse.json({ worlds: [] });
  }
}
