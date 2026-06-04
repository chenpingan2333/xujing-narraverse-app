import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { inviteService } from "@/features/narraverse/auth/invite.service";
import { GenerateInviteRequest } from "@/features/narraverse/auth/types";

/**
 * POST /api/admin/invite/generate
 *
 * Admin-only endpoint to generate invite codes.
 * Requires: authenticated session + isAdmin flag on user record.
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth();

    const admin = await inviteService.isAdmin(ctx.userId);
    if (!admin) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = GenerateInviteRequest.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "参数不正确" },
        { status: 400 },
      );
    }

    const { type, count, maxUses, expiresInDays } = parsed.data;
    const codes = await inviteService.generate(
      ctx.userId,
      type,
      count,
      maxUses,
      expiresInDays,
    );

    return NextResponse.json({ codes, type, count }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      return NextResponse.json(
        { error: (err as { message: string }).message },
        { status: 401 },
      );
    }
    console.error(
      "Admin generate invite error:",
      err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
    );
    return NextResponse.json({ error: "生成失败" }, { status: 500 });
  }
}
