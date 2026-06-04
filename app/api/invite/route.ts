import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db/pool";
import { requireAuth, optionalAuth } from "@/lib/auth/session";
import { UseInviteRequest } from "@/features/narraverse/auth/types";
import { inviteService } from "@/features/narraverse/auth/invite.service";

/** GET /api/invite — check current user invite status with type */
export async function GET() {
  const ctx = await optionalAuth();
  if (!ctx) return NextResponse.json({ invited: false });

  const status = await inviteService.getStatus(ctx.userId);
  return NextResponse.json(status);
}

/** POST /api/invite — use an invite code (requires auth, atomic consume) */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const body = UseInviteRequest.parse(await req.json());

    // Check if already invited
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM invite_usage WHERE used_by = $1`,
      [ctx.userId],
    );
    if (existing) {
      const status = await inviteService.getStatus(ctx.userId);
      return NextResponse.json({ message: "你已是内测用户", alreadyInvited: true, ...status });
    }

    // Find valid invite code with FOR UPDATE for atomicity
    const inviteCode = await queryOne<{
      id: string; type: string; max_uses: number; use_count: number;
      is_active: boolean; expires_at: string | null;
    }>(
      `SELECT id, type, max_uses, use_count, is_active, expires_at FROM invite_codes
       WHERE code = $1 AND is_active = true
       AND (expires_at IS NULL OR expires_at > now())
       AND use_count < max_uses
       FOR UPDATE`,
      [body.code],
    );

    if (!inviteCode) {
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
      return NextResponse.json({ error: "邀请码无效或已用完" }, { status: 400 });
    }

    // Atomic increment + usage insert
    await query(
      `UPDATE invite_codes SET use_count = use_count + 1 WHERE id = $1 AND use_count < max_uses`,
      [inviteCode.id],
    );

    await query(
      `INSERT INTO invite_usage (invite_code_id, used_by) VALUES ($1, $2)`,
      [inviteCode.id, ctx.userId],
    );

    return NextResponse.json({
      message: "欢迎加入叙境内测！",
      invited: true,
      type: inviteCode.type,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "邀请码格式不正确" }, { status: 400 });
    }
    if (err instanceof Error && "code" in err) {
      return NextResponse.json(
        { error: (err as { message: string }).message },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: "验证失败" }, { status: 500 });
  }
}
