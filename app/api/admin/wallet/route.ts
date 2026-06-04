import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db/pool";

export async function GET(req: NextRequest) {
  try {
    const authCtx = await requireAuth();
    if (!authCtx.user.isAdmin) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";

    const user = await queryOne<{
      id: string; name: string; email: string; uid_display: string;
      star_diamonds: number; is_vip: boolean;
    }>(
      "SELECT u.id, u.name, u.email, u.uid_display, COALESCE(w.star_diamonds, 0) as star_diamonds, u.is_vip FROM users u LEFT JOIN wallets w ON w.user_id = u.id WHERE u.uid_display = $1 OR u.email ILIKE $2 OR u.name ILIKE $2 LIMIT 1",
      [q, "%" + q + "%"]
    );

    if (!user) return NextResponse.json({ user: null });

    return NextResponse.json({
      user: {
        id: user.id, name: user.name, email: user.email,
        uidDisplay: user.uid_display, starDiamonds: user.star_diamonds,
        isVip: user.is_vip,
      },
    });
  } catch {
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCtx = await requireAuth();
    if (!authCtx.user.isAdmin) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, amount, reason } = body;

    // Ensure wallet exists
    await query(
      "INSERT INTO wallets (user_id, star_diamonds) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING",
      [userId]
    );

    // Get current balance
    const wallet = await queryOne<{ id: string; star_diamonds: number }>(
      "SELECT id, star_diamonds FROM wallets WHERE user_id = $1",
      [userId]
    );

    const balanceBefore = wallet?.star_diamonds ?? 0;
    const balanceAfter = balanceBefore + amount;

    // Update wallet
    await query(
      "UPDATE wallets SET star_diamonds = star_diamonds + $1, updated_at = now() WHERE user_id = $2",
      [amount, userId]
    );

    // Record transaction
    await query(
      "INSERT INTO transactions (user_id, type, amount, currency, balance_before, balance_after, description, created_at) VALUES ($1, 'deposit', $2, 'star', $3, $4, $5, now())",
      [userId, amount, balanceBefore, balanceAfter, reason ?? "管理员充值"]
    );

    // Log admin operation
    await query(
      "INSERT INTO admin_wallet_ops (admin_id, target_user_id, operation, amount, reason) VALUES ($1, $2, 'add_stars', $3, $4)",
      [authCtx.userId, userId, amount, reason ?? "管理员手动充值"]
    );

    return NextResponse.json({ success: true, balanceAfter });
  } catch (err) {
    console.error("Admin wallet error:", err);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
