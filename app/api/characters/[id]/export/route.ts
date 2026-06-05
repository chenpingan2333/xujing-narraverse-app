import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { queryOne } from "@/lib/db/pool";
import { exportCharacterCardJson } from "@/lib/character-cards";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    const { id } = await params;

    const row = await queryOne(
      "SELECT * FROM characters WHERE id = $1 AND (user_id = $2 OR is_official = true)",
      [id, auth.userId]
    );
    if (!row) return NextResponse.json({ error: "角色不存在" }, { status: 404 });

    const json = exportCharacterCardJson(row as Record<string, unknown>);
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${(row as Record<string,unknown>)["name"] || "character"}.json"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
}