import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { query } from "@/lib/db/pool";

export async function GET(req: NextRequest) {
  try {
    const authCtx = await requireAuth();
    const userId = authCtx.userId;

    const transactions = await query<{
      id: string; type: string; amount: number; currency: string;
      description: string; created_at: string;
    }>(
      "SELECT id, type, amount, currency, description, created_at FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
      [userId],
    );

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        description: t.description,
        createdAt: t.created_at,
      })),
    });
  } catch {
    return NextResponse.json({ transactions: [] });
  }
}
