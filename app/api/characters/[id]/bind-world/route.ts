import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { queryOne } from "@/lib/db/pool";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const worldId = body.world_id || null;

    const existing = await queryOne(
      "SELECT id, user_id FROM characters WHERE id = $1",
      [id]
    );
    if (!existing) return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    if (existing["user_id"] !== userId) return NextResponse.json({ error: "无权操作" }, { status: 403 });

    if (worldId) {
      const world = await queryOne("SELECT id FROM official_worlds WHERE id = $1", [worldId]);
      if (!world) return NextResponse.json({ error: "世界包不存在" }, { status: 404 });
      // Update world_view from world
      await queryOne(
        "UPDATE characters SET world_id = $1, updated_at = now() WHERE id = $2",
        [worldId, id]
      );
    } else {
      await queryOne(
        "UPDATE characters SET world_id = NULL, updated_at = now() WHERE id = $1",
        [id]
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
}
