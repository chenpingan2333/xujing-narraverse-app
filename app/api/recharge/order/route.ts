import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getPool } from "@/lib/db/pool";
import { withErrorHandler, safeJson, safeError } from "@/lib/api/error-handler";

/** POST /api/recharge/order — payment transaction with rollback protection */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const authCtx = await requireAuth();
  const userId = authCtx.userId;
  const body = await req.json();

  const stars = Number(body.stars);
  const method = String(body.method ?? "unknown");

  if (!stars || stars <= 0) return safeError("Invalid star amount", 400);

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "INSERT INTO recharge_orders (user_id, package_stars, package_price, payment_method) VALUES ($1, $2, $3, $4)",
      [userId, stars, stars / 100, method]
    );

    await client.query("COMMIT");

    return safeJson({ order: { userId, stars, method } }, 201);
  } catch (txErr) {
    await client.query("ROLLBACK");
    const msg = txErr instanceof Error ? txErr.message.slice(0, 500) : String(txErr).slice(0, 500);
    console.error(`[payment_error] userId=${userId} stars=${stars}:`, msg);
    return safeError("Payment processing failed, order rolled back", 500);
  } finally {
    client.release();
  }
});