import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db/pool";
import { CREATOR_REVENUE_SPLIT, PLATFORM_REVENUE_SPLIT } from "@/features/narraverse/payment/payment.types";

export async function POST(req: NextRequest) {
  try {
    const authCtx = await requireAuth();
    const buyerId = authCtx.userId;

    const body = await req.json();
    const { characterId } = body;

    if (!characterId) {
      return NextResponse.json({ error: "请选择角色" }, { status: 400 });
    }

    // Get marketplace listing
    const listing = await queryOne<{
      id: string; character_id: string; creator_id: string;
      price: number; status: string;
    }>(
      "SELECT cm.id, cm.character_id, cm.creator_id, cm.price, cm.status FROM character_marketplace cm WHERE cm.character_id = $1 AND cm.status = 'active'",
      [characterId]
    );

    if (!listing) {
      return NextResponse.json({ error: "该角色已下架" }, { status: 404 });
    }

    if (listing.creator_id === buyerId) {
      return NextResponse.json({ error: "不能购买自己的角色" }, { status: 400 });
    }

    // Check wallet balance
    const wallet = await queryOne<{ id: string; star_diamonds: number }>(
      "SELECT id, star_diamonds FROM wallets WHERE user_id = $1",
      [buyerId]
    );

    if (!wallet || wallet.star_diamonds < listing.price) {
      return NextResponse.json({ error: "星钻不足" }, { status: 402 });
    }

    // Calculate split
    const creatorShare = Math.floor(listing.price * CREATOR_REVENUE_SPLIT);
    const platformShare = listing.price - creatorShare;

    // Create copy of character for buyer
    const origChar = await queryOne<{ name: string; persona: string; description: string; tier: string; avatar: string }>(
      "SELECT name, persona, description, tier, avatar FROM characters WHERE id = $1",
      [listing.character_id]
    );

    const newChar = await queryOne<{ id: string }>(
      "INSERT INTO characters (user_id, name, persona, description, tier, avatar) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [buyerId, origChar!.name + " (副本)", origChar!.persona, origChar!.description, origChar!.tier, origChar!.avatar]
    );

    // Deduct from buyer wallet
    await query(
      "UPDATE wallets SET star_diamonds = star_diamonds - $1, updated_at = now() WHERE user_id = $2",
      [listing.price, buyerId]
    );

    // Add to creator wallet
    await query(
      "INSERT INTO wallets (user_id, star_diamonds, creator_diamonds) VALUES ($1, 0, $2) ON CONFLICT (user_id) DO UPDATE SET creator_diamonds = wallets.creator_diamonds + $2, updated_at = now()",
      [listing.creator_id, creatorShare]
    );

    // Platform revenue
    await query(
      "INSERT INTO wallets (user_id, star_diamonds) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET star_diamonds = wallets.star_diamonds + $2, updated_at = now()",
      ["00000000-0000-0000-0000-000000000000", platformShare]
    );

    // Record purchase
    await query(
      "INSERT INTO purchased_characters (buyer_id, original_character_id, marketplace_id, copy_character_id, price_paid, creator_share, platform_share) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [buyerId, listing.character_id, listing.id, newChar!.id, listing.price, creatorShare, platformShare]
    );

    // Update sales count
    await query(
      "UPDATE character_marketplace SET sales_count = sales_count + 1, revenue = revenue + $1, updated_at = now() WHERE id = $2",
      [listing.price, listing.id]
    );

    // Record transactions
    const now = new Date().toISOString();
    await query(
      "INSERT INTO transactions (user_id, type, amount, currency, description, created_at) VALUES ($1, 'character_purchase', $2, 'star', $3, $4)",
      [buyerId, -listing.price, "购买角色：" + origChar!.name, now]
    );
    await query(
      "INSERT INTO transactions (user_id, type, amount, currency, description, created_at) VALUES ($1, 'creator_income', $2, 'creator', $3, $4)",
      [listing.creator_id, creatorShare, "角色售卖分成：" + origChar!.name, now]
    );

    return NextResponse.json({ success: true, characterId: newChar!.id });
  } catch (err) {
    console.error("Purchase error:", err);
    return NextResponse.json({ error: "购买失败" }, { status: 500 });
  }
}
