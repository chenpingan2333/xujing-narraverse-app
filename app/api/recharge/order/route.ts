import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { query } from "@/lib/db/pool";

export async function POST(req: NextRequest) {
  try {
    const authCtx = await requireAuth();
    const userId = authCtx.userId;
    const body = await req.json();

    await query(
      "INSERT INTO recharge_orders (user_id, package_stars, package_price, payment_method) VALUES ($1, $2, $3, $4)",
      [userId, body.stars, (body.stars / 100), body.method]
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
