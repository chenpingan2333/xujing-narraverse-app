import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { queryOne } from "@/lib/db/pool";
import { parseImportJson, previewToInsert } from "@/lib/character-cards";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const body = await req.json();

    const result = parseImportJson(body.json ?? body);
    if (result.error || !result.preview) {
      return NextResponse.json({ error: result.error || "解析失败" }, { status: 400 });
    }

    if (body.confirm === true) {
      const preview = result.preview;
      const row = await queryOne(
        `INSERT INTO characters (
          user_id, name, persona, description,
          display_name, display_description,
          greeting, speech_style, world_view, story_nodes,
          rarity, price_star, is_verified, is_official
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,false,false)
        RETURNING *`,
        [
          userId,
          preview.name,
          preview.persona,
          preview.description,
          preview.name,
          preview.persona || preview.description,
          preview.greeting,
          preview.speechStyle,
          preview.worldView,
          JSON.stringify(preview.storyNodes),
          "normal",
          0,
        ]
      );
      return NextResponse.json({ character: row }, { status: 201 });
    }

    return NextResponse.json({ preview: result.preview });
  } catch {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
}