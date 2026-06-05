import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { queryOne } from "@/lib/db/pool";
import { parseImportJson, previewToInsert } from "@/lib/character-cards";
import { withErrorHandler, safeJson, safeError } from "@/lib/api/error-handler";

/** POST /api/characters/import — batch import with per-item fault tolerance */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const { userId } = await requireAuth();
  const body = await req.json();

  // Preview mode: parse only, no insert
  const result = parseImportJson(body.json ?? body);
  if (result.error || !result.preview) {
    return safeError(result.error || "解析失败", 400);
  }

  if (body.confirm !== true) {
    return safeJson({ preview: result.preview });
  }

  // Batch import: single failure must not abort entire batch
  const items = Array.isArray(body.items ?? body.json)
    ? (body.items ?? body.json)
    : [result.preview];

  const outcomes = { imported: 0, failed: 0, errors: [] as string[] };

  for (let i = 0; i < items.length; i++) {
    try {
      const item = items[i];
      const preview = typeof item === "object" ? item : parseImportJson(item).preview;
      if (!preview) {
        outcomes.failed++;
        outcomes.errors.push(`Item ${i}: 解析失败`);
        continue;
      }

      await queryOne(
        `INSERT INTO characters (
          user_id, name, persona, description,
          display_name, display_description,
          greeting, speech_style, world_view, story_nodes,
          rarity, price_star, is_verified, is_official
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,false,false)
        RETURNING *`,
        [
          userId, preview.name, preview.persona, preview.description,
          preview.name, preview.persona || preview.description,
          preview.greeting, preview.speechStyle,
          preview.worldView, JSON.stringify(preview.storyNodes),
          "normal", 0,
        ]
      );
      outcomes.imported++;
    } catch (itemErr) {
      outcomes.failed++;
      const msg = itemErr instanceof Error ? itemErr.message.slice(0, 200) : String(itemErr).slice(0, 200);
      outcomes.errors.push(`Item ${i}: ${msg}`);
      console.error(`[import] item ${i} failed:`, msg);
    }
  }

  return NextResponse.json(
    { success: true, ...outcomes },
    { status: outcomes.imported > 0 ? 201 : 400 }
  );
});