import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { queryOne } from "@/lib/db/pool";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const body = await req.json();

    const row = await queryOne(
      `INSERT INTO official_worlds (
        name, description, display_name, cover_image,
        world_type, ai_role, user_role, premise,
        rules, hierarchy, glossary, atmosphere,
        world_prompt, simple_mode, creator, is_official, is_verified
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, false, $14, true, true
      ) RETURNING *`,
      [
        body.world_name || body.name || "",
        body.description || "",
        body.display_name || body.world_name || body.name || "",
        body.cover_image || "",
        body.world_type || "custom",
        body.ai_role || "",
        body.user_role || "",
        body.premise || "",
        JSON.stringify(body.rules || []),
        JSON.stringify(body.hierarchy || ""),
        JSON.stringify(body.glossary || {}),
        body.atmosphere || "",
        body.system_prompt || "",
        body.creator || auth.user.name || "叙境官方",
      ]
    );

    return NextResponse.json({ world: row }, { status: 201 });
  } catch (e) {
    console.error("World create error:", e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
