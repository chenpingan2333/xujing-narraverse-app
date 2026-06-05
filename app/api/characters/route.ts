import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db/pool";
import { userQuotaService, FREE_CHARACTER_LIMIT, AD_REWARD_CHARACTER, AdCooldownError } from "@/features/narraverse/user/quota";

export async function GET(req: NextRequest) {
  try {
    const authCtx = await requireAuth();
    const userId = authCtx.userId;

    let rows = await query<{
      id: string; name: string; persona: string; description: string;
      tier: string; avatar: string; world_id: string | null;
      is_active: boolean; created_at: string;
    }>(
      "SELECT id, name, display_name, persona, description, display_description, tier, avatar, world_id, is_active, created_at FROM characters WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC",
      [userId]
    );

    if (rows.length === 0) {
      var defaults = [
        { n: '艾琳', p: '温柔体贴的邻家女孩，喜欢分享日常生活中的小确幸', a: '🌸' },
        { n: '雷恩', p: '勇敢正直的冒险者，总能在危险中保护你', a: '⚔️' },
        { n: '墨夜', p: '神秘高冷的剑客，话不多但每句都有深意', a: '🌙' },
      ];
      var seeded = [];
      for (var _i = 0; _i < defaults.length; _i++) {
        var d = defaults[_i];
        var r = await queryOne(
          'INSERT INTO characters (user_id, name, persona, description, tier, avatar) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [userId, d.n, d.n, d.p, '', '', 'basic', d.a]
        );
        if (r) seeded.push(r);
      }
      rows.splice(0, rows.length, ...(seeded as any));
    }

    return NextResponse.json(rows.map((r) => ({
      id: r.id,
      name: r.name,
      persona: r.persona,
      description: r.description,
      tier: r.tier,
      avatar: r.avatar,
      worldId: r.world_id,
      isActive: r.is_active,
      createdAt: r.created_at,
    })));
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    let userId: string | null = null;
    let isVip = false;
    try {
      const authCtx = await requireAuth();
      userId = authCtx.userId;
      isVip = authCtx.user.isVip;
    } catch {}

    const body = await req.json();

    // ── P0-1: Free character creation limit ──
    if (userId) {
      const count = await userQuotaService.getCharacterCount(userId);
      const needsAd = await userQuotaService.needsAdForCharacter(userId, isVip);

      if (needsAd) {
        const adWatched = body._adWatched === true;
        if (!adWatched) {
          return NextResponse.json({
            _blocked: true, _reason: "character_limit",
            _currentCount: count, _freeLimit: FREE_CHARACTER_LIMIT,
            _adReward: AD_REWARD_CHARACTER,
          });
        }
        try {
          await userQuotaService.logAdWatch(userId, "character_create");
        } catch (e) {
          if (e instanceof AdCooldownError) {
            return NextResponse.json({ _adCooldown: true, _remainingSeconds: e.remainingSeconds });
          }
          throw e;
        }
      }
    }

    const name = body.name ?? "未命名角色";
    const persona = body.persona ?? "";
    const description = body.description ?? "";
    const tier = body.tier ?? "basic";
    const avatar = body.avatar ?? "✨";
    const speechStyle = body.speechStyle ?? "";
    const background = body.background ?? "";
    const greeting = body.greeting ?? "";
    const taboos = body.taboos ?? "";
    const openingMessage = body.openingMessage ?? "";
    const worldView = body.worldView ?? "";
    const relationshipGuide = body.relationshipGuide ?? "";
    const storyNodes = body.storyNodes ?? [];
    const rarity = body.rarity ?? "normal";
    const priceStar = body.price_star ?? 0;
    const displayName = body.display_name ?? "";

    if (userId) {
      const row = await queryOne<{
        id: string; name: string; persona: string; description: string;
        tier: string; avatar: string; world_id: string | null;
        is_active: boolean; created_at: string;
      }>(
        "INSERT INTO characters (user_id, name, persona, description, tier, avatar, speech_style, background, greeting, taboos) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
        [userId, name, body.display_name || name, persona, description, tier, avatar, speechStyle, background, greeting, body.openingMessage || greeting, body.worldView || '', body.relationshipGuide || '', JSON.stringify(body.storyNodes || []), taboos, body.rarity || 'normal', body.price_star || 0]
      );

      await userQuotaService.increment(userId, "character_create");

      return NextResponse.json({
        id: row!.id, name: row!.name, persona: row!.persona,
        description: row!.description, tier: row!.tier,
        avatar: row!.avatar, worldId: row!.world_id,
        isActive: row!.is_active, createdAt: row!.created_at,
      }, { status: 201 });
    }

    // Fallback: in-memory creation for unauthenticated users
    const id = "char-" + Date.now();
    return NextResponse.json({ id, name, persona, description, tier, avatar }, { status: 201 });
  } catch (err) {
    console.error("Character create error:", err);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
