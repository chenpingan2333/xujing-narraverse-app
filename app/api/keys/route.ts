import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db/pool";
import { requireAuth } from "@/lib/auth/session";
import { generateApiKey, encrypt } from "@/lib/auth/crypto";
import { CreateApiKeyRequest, type ApiKeyResponse } from "@/features/narraverse/auth/types";

/** GET /api/keys — list user's API keys (without full key) */
export async function GET() {
  try {
    const ctx = await requireAuth();
    const rows = await query<ApiKeyResponse>(
      `SELECT id, name, key_prefix AS "keyPrefix", provider,
              is_active AS "isActive", usage_limit AS "usageLimit",
              usage_count AS "usageCount", created_at AS "createdAt"
       FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
      [ctx.userId],
    );
    return NextResponse.json({ keys: rows });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      return NextResponse.json({ error: (err as { message: string }).message }, { status: 401 });
    }
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}

/** POST /api/keys — create a new API key */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    if (!ctx.user.isVip) {
      return NextResponse.json({ error: "仅 VIP 用户可创建 API Key" }, { status: 403 });
    }

    const body = CreateApiKeyRequest.parse(await req.json());
    const { fullKey, keyHash, keyPrefix } = generateApiKey();
    const encryptedKey = encrypt(fullKey);
    const name = body.name || `Key-${new Date().toISOString().slice(0, 10)}`;

    await query(
      `INSERT INTO api_keys (user_id, name, key_hash, key_prefix, encrypted_key, provider, usage_limit)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [ctx.userId, name, keyHash, keyPrefix, encryptedKey, body.provider, body.usageLimit ?? null],
    );

    // Return full key — THIS IS THE ONLY TIME IT'S SHOWN
    return NextResponse.json({
      key: { name, keyPrefix, fullKey, provider: body.provider, isActive: true, usageLimit: body.usageLimit ?? null, usageCount: 0 },
    }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "参数不正确" }, { status: 400 });
    }
    if (err instanceof Error && "code" in err) {
      return NextResponse.json({ error: (err as { message: string }).message }, { status: 401 });
    }
    console.error("Create API key error:", err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200));
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}

/** DELETE /api/keys — delete an API key by id */
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少 key id" }, { status: 400 });

    const result = await query(
      `DELETE FROM api_keys WHERE id = $1 AND user_id = $2`,
      [id, ctx.userId],
    );

    return NextResponse.json({ message: "已删除" });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      return NextResponse.json({ error: (err as { message: string }).message }, { status: 401 });
    }
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}