import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db/pool";

/** GET /api/characters/[id] — 获取单个角色 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;

    const row = await queryOne(
      `SELECT * FROM characters WHERE id = $1 AND user_id = $2 AND is_active = true`,
      [id, userId]
    );
    if (!row) return NextResponse.json({ error: "角色不存在" }, { status: 404 });

    return NextResponse.json({ character: row });
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
}

/** PUT /api/characters/[id] — 更新角色（官方角色不可编辑） */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;

    const existing = await queryOne<{ is_official: boolean; user_id: string }>(
      "SELECT is_official, user_id FROM characters WHERE id = $1",
      [id]
    );
    if (!existing) return NextResponse.json({ error: "角色不存在" }, { status: 404 });

    // 官方角色不可编辑
    if (existing.is_official) {
      return NextResponse.json({ error: "官方角色不可直接编辑，请先复制到你的角色库" }, { status: 403 });
    }

    // 只能编辑自己的角色
    if (existing.user_id !== userId) {
      return NextResponse.json({ error: "无权编辑此角色" }, { status: 403 });
    }

    const body = await req.json();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const updatable = ["name","display_name","persona","display_description","description","avatar","speech_style","background","greeting","taboos","world_view","opening_message","relationship_guide"];
    for (const f of updatable) {
      if (body[f] !== undefined) {
        fields.push(`${f} = $${idx++}`);
        values.push(body[f]);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
    }

    fields.push(`updated_at = now()`);
    values.push(id);

    const row = await queryOne(
      `UPDATE characters SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    return NextResponse.json({ character: row });
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
}

/** DELETE /api/characters/[id] — 删除角色（官方角色不可删除） */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;

    const existing = await queryOne<{ is_official: boolean; user_id: string }>(
      "SELECT is_official, user_id FROM characters WHERE id = $1",
      [id]
    );
    if (!existing) return NextResponse.json({ error: "角色不存在" }, { status: 404 });

    if (existing.is_official) {
      return NextResponse.json({ error: "官方角色不可删除" }, { status: 403 });
    }

    if (existing.user_id !== userId) {
      return NextResponse.json({ error: "无权删除此角色" }, { status: 403 });
    }

    await query("UPDATE characters SET is_active = false, updated_at = now() WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
}