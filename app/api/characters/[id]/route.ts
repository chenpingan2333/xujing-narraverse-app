import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db/pool";
import { withErrorHandler, safeJson, safeError } from "@/lib/api/error-handler";

type Params = { params: Promise<{ id: string }> };

/** GET /api/characters/[id] */
export const GET = withErrorHandler(async (_req: NextRequest, { params }: Params) => {
  const { userId } = await requireAuth();
  const { id } = await params;

  const row = await queryOne(
    `SELECT * FROM characters WHERE id = $1 AND user_id = $2 AND is_active = true`,
    [id, userId]
  );
  if (!row) {
    return NextResponse.json({ success: false, data: null, message: "Character not found" }, { status: 404 });
  }

  return safeJson({ character: row });
});

/** PUT /api/characters/[id] */
export const PUT = withErrorHandler(async (req: NextRequest, { params }: Params) => {
  const { userId } = await requireAuth();
  const { id } = await params;

  const existing = await queryOne<{ is_official: boolean; user_id: string }>(
    "SELECT is_official, user_id FROM characters WHERE id = $1",
    [id]
  );
  if (!existing) return safeError("Character not found", 404);
  if (existing.is_official) return safeError("官方角色不可直接编辑，请先复制到你的角色库", 403);
  if (existing.user_id !== userId) return safeError("无权编辑此角色", 403);

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

  if (fields.length === 0) return safeError("没有可更新的字段", 400);

  fields.push(`updated_at = now()`);
  values.push(id);

  const row = await queryOne(
    `UPDATE characters SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );

  return safeJson({ character: row });
});

/** DELETE /api/characters/[id] */
export const DELETE = withErrorHandler(async (_req: NextRequest, { params }: Params) => {
  const { userId } = await requireAuth();
  const { id } = await params;

  const existing = await queryOne<{ is_official: boolean; user_id: string }>(
    "SELECT is_official, user_id FROM characters WHERE id = $1",
    [id]
  );
  if (!existing) return safeError("Character not found", 404);
  if (existing.is_official) return safeError("官方角色不可删除", 403);
  if (existing.user_id !== userId) return safeError("无权删除此角色", 403);

  await query("UPDATE characters SET is_active = false, updated_at = now() WHERE id = $1", [id]);
  return NextResponse.json({ success: true });
});