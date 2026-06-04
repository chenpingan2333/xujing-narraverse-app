import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { customCharacterService } from "@/features/narraverse/characters/service";
import { CreateCharacterRequest, UpdateCharacterRequest } from "@/features/narraverse/characters/types";

/**
 * GET  /api/characters/custom        — list user's custom characters
 * POST /api/characters/custom        — create a new character
 * GET  /api/characters/custom?id=X   — get single character
 * PATCH  /api/characters/custom      — update a character (body includes id)
 * DELETE /api/characters/custom?id=X — delete a character
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const character = customCharacterService.get(ctx.userId, id);
      if (!character) {
        return NextResponse.json({ error: "角色不存在" }, { status: 404 });
      }
      return NextResponse.json(character);
    }

    const list = customCharacterService.list(ctx.userId);
    return NextResponse.json({ characters: list });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      return NextResponse.json({ error: (err as { message: string }).message }, { status: 401 });
    }
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const body = await req.json();

    const parsed = CreateCharacterRequest.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "参数不正确" }, { status: 400 });
    }

    const character = customCharacterService.create(ctx.userId, parsed.data);
    return NextResponse.json(character, { status: 201 });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      return NextResponse.json({ error: (err as { message: string }).message }, { status: 401 });
    }
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const body = await req.json();
    const { id, ...fields } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "缺少角色ID" }, { status: 400 });
    }

    const parsed = UpdateCharacterRequest.safeParse(fields);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "参数不正确" }, { status: 400 });
    }

    const updated = customCharacterService.update(ctx.userId, id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      return NextResponse.json({ error: (err as { message: string }).message }, { status: 401 });
    }
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少角色ID" }, { status: 400 });
    }

    const deleted = customCharacterService.delete(ctx.userId, id);
    if (!deleted) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      return NextResponse.json({ error: (err as { message: string }).message }, { status: 401 });
    }
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
