import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db/pool";

export async function GET(req: NextRequest) {
  try {
    const authCtx = await requireAuth();
    const userId = authCtx.userId;

    const wallet = await queryOne<{
      id: string; user_id: string; star_diamonds: number;
      creator_diamonds: number; created_at: string; updated_at: string;
    }>(
      "SELECT id, user_id, star_diamonds, creator_diamonds, created_at, updated_at FROM wallets WHERE user_id = $1",
      [userId],
    );

    if (!wallet) {
      return NextResponse.json({
        wallet: {
          starDiamonds: 0,
          creatorDiamonds: 0,
          totalEarned: 0,
          totalSpent: 0,
        },
      });
    }

    const totals = await queryOne<{ earned: string; spent: string }>(
      "SELECT COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as earned, COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) as spent FROM transactions WHERE user_id = $1 AND currency = 'star'",
      [userId],
    );

    return NextResponse.json({
      wallet: {
        starDiamonds: wallet.star_diamonds,
        creatorDiamonds: wallet.creator_diamonds,
        totalEarned: parseInt(totals?.earned ?? "0"),
        totalSpent: parseInt(totals?.spent ?? "0"),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "请先登录") {
      return NextResponse.json({ wallet: { starDiamonds: 0, creatorDiamonds: 0, totalEarned: 0, totalSpent: 0 } });
    }
    return NextResponse.json({ wallet: { starDiamonds: 0, creatorDiamonds: 0, totalEarned: 0, totalSpent: 0 } });
  }
}
