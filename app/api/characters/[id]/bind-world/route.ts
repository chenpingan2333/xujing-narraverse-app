import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { queryOne } from "@/lib/db/pool";
import { withErrorHandler, safeJson, safeError } from "@/lib/api/error-handler";

type Params = { params: Promise<{ id: string }> };

/** PUT /api/characters/[id]/bind-world — bind or unbind a character to a world */
export const PUT = withErrorHandler(async (req: NextRequest, { params }: Params) => {
  const { userId } = await requireAuth();
  const { id } = await params;
  const body = await req.json();
  const worldId: string | null = body.world_id || null;

  // Validate character exists and belongs to user
  const character = await queryOne<{ user_id: string }>(
    "SELECT id, user_id FROM characters WHERE id = $1",
    [id]
  );
  if (!character) return safeError("Character not found", 404);
  if (character.user_id !== userId) return safeError("无权操作", 403);

  // Validate world exists (if binding, not unbinding)
  if (worldId) {
    const world = await queryOne("SELECT id FROM official_worlds WHERE id = $1", [worldId]);
    if (!world) return safeError("世界包不存在", 404);
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

  return safeJson({ characterId: id, worldId });
});