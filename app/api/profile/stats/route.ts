import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { userQuotaService } from "@/features/narraverse/user/quota";

export async function GET(req: NextRequest) {
  try {
    const authCtx = await requireAuth();
    const userId = authCtx.userId;

    const [turns, charCount] = await Promise.all([
      userQuotaService.getConversationTurns(userId),
      userQuotaService.getCharacterCount(userId),
    ]);

    return NextResponse.json({
      conversationTurns: turns,
      characterCount: charCount,
      memoryCount: 0, // TODO: count from memory store
    });
  } catch {
    return NextResponse.json({ conversationTurns: 0, characterCount: 0, memoryCount: 0 });
  }
}
