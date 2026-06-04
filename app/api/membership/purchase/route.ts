import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db/pool";
import { MEMBERSHIP_PRICES } from "@/config/economy";

type MembershipPlan = "monthly" | "quarterly" | "yearly";

const PLAN_DURATION_DAYS: Record<MembershipPlan, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

export async function POST(req: NextRequest) {
  try {
    const authCtx = await requireAuth();
    const userId = authCtx.userId;

    const body = await req.json();
    const plan = body.plan as MembershipPlan;

    if (!plan || !["monthly", "quarterly", "yearly"].includes(plan)) {
      return NextResponse.json({ error: "无效的会员方案" }, { status: 400 });
    }

    // Check if user already has active membership
    const existing = await queryOne<{ membership_tier: string | null; membership_expire_at: string }>(
      "SELECT membership_tier, membership_expire_at FROM users WHERE id = $1",
      [userId],
    );

    if (existing?.membership_tier && new Date(existing.membership_expire_at) > new Date()) {
      return NextResponse.json({ error: "您已有生效中的会员" }, { status: 400 });
    }

    // Determine price (first-purchase discount)
    const hasEverPurchased = !!(await queryOne<{ first_vip_purchase_at: string }>(
      "SELECT first_vip_purchase_at FROM users WHERE id = $1",
      [userId]
    ))?.first_vip_purchase_at;

    let price: number = MEMBERSHIP_PRICES[plan];
    if (plan === "monthly" && !hasEverPurchased) {
      price = MEMBERSHIP_PRICES.monthlyFirst;
    }

    // Check wallet balance
    const wallet = await queryOne<{ id: string; star_diamonds: number }>(
      "SELECT id, star_diamonds FROM wallets WHERE user_id = $1",
      [userId],
    );

    const balance = wallet?.star_diamonds ?? 0;
    if (balance < price) {
      return NextResponse.json({
        _insufficient: true,
        _needed: price - balance,
        _balance: balance,
      }, { status: 200 });
    }

    // Deduct from wallet
    await query(
      "UPDATE wallets SET star_diamonds = star_diamonds - $1, updated_at = now() WHERE user_id = $2",
      [price, userId],
    );

    // Record transaction
    await query(
      "INSERT INTO transactions (user_id, type, amount, currency, balance_before, balance_after, description, created_at) VALUES ($1, 'membership', $2, 'star', $3, $4, $5, now())",
      [userId, -price, balance, balance - price, "购买会员: " + plan],
    );

    // Activate membership
    const durationDays = PLAN_DURATION_DAYS[plan];
    const expireAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    await query(
      "UPDATE users SET is_vip = true, membership_tier = $1, membership_expire_at = $2, first_vip_purchase_at = COALESCE(first_vip_purchase_at, now()), updated_at = now() WHERE id = $3",
      [plan, expireAt.toISOString(), userId],
    );

    // Record membership history
    await query(
      "INSERT INTO user_memberships (user_id, plan, price_stars, is_first_purchase, expire_at) VALUES ($1, $2, $3, $4, $5)",
      [userId, plan, price, !hasEverPurchased, expireAt.toISOString()],
    );

    return NextResponse.json({
      success: true,
      plan,
      price,
      isFirstPurchase: !hasEverPurchased,
      expireAt: expireAt.toISOString(),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "请先登录") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    console.error("Membership purchase error:", err);
    return NextResponse.json({ error: "购买失败" }, { status: 500 });
  }
}
