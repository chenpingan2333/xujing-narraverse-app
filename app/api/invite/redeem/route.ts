import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db/pool";
import { requireAuth } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/auth/rate-limiter";
import { inviteService } from "@/features/narraverse/auth/invite.service";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const rl = checkRateLimit("invite-redeem:" + ctx.userId, 5, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "尝试次数过多，请10分钟后再试" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        },
      );
    }

    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM invite_usage WHERE used_by = $1",
      [ctx.userId],
    );
    if (existing) {
      const status = await inviteService.getStatus(ctx.userId);
      return NextResponse.json({ message: "你已是内测用户", alreadyInvited: true, ...status });
    }

    const body = await req.json();
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code) {
      return NextResponse.json({ error: "请输入邀请码" }, { status: 400 });
    }

    const invite = await queryOne<{ id: string; type: string }>(
      `SELECT id, type FROM invite_codes
       WHERE code = $1 AND is_active = true
       AND (expires_at IS NULL OR expires_at > now())
       AND use_count < max_uses
       FOR UPDATE`,
      [code],
    );

    if (!invite) {
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
      return NextResponse.json({ error: "邀请码无效或已用完" }, { status: 400 });
    }

    await query(
      "UPDATE invite_codes SET use_count = use_count + 1 WHERE id = $1 AND use_count < max_uses",
      [invite.id],
    );
    await query(
      "INSERT INTO invite_usage (invite_code_id, used_by) VALUES ($1, $2)",
      [invite.id, ctx.userId],
    );

    return NextResponse.json({
      message: "欢迎加入叙境内测！",
      invited: true,
      type: invite.type,
    });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      return NextResponse.json(
        { error: (err as { message: string }).message },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: "兑换失败，请稍后重试" }, { status: 500 });
  }
}
