import { NextRequest, NextResponse } from "next/server";

/**
 * withErrorHandler — wraps any API route handler with unified error handling.
 * Uses a flexible generic signature compatible with Next.js 15.5+ route typing.
 */
export function withErrorHandler<T>(
  handler: (req: NextRequest, ctx: T) => Promise<NextResponse>
): (req: NextRequest, ctx: T) => Promise<NextResponse> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      const message = err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500);
      console.error(`[API_ERROR] ${req.method} ${req.nextUrl.pathname}:`, message);

      const isProd = process.env.NODE_ENV === "production";
      return NextResponse.json(
        {
          success: false,
          error: "INTERNAL_ERROR",
          message: isProd ? "Server error" : message,
        },
        { status: 500 }
      );
    }
  };
}

/**
 * safeJson — returns a unified JSON envelope for API responses.
 */
export function safeJson(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function safeError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}