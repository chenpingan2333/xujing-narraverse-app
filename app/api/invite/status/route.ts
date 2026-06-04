import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { inviteService } from "@/features/narraverse/auth/invite.service";

export async function GET() {
  try {
    const ctx = await requireAuth();
    const status = await inviteService.getStatus(ctx.userId);
    return NextResponse.json(status);
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      return NextResponse.json(
        { error: (err as { message: string }).message },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}
