import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { onboardingService } from "@/features/narraverse/onboarding/service";
import {
  UpdateOnboardingStepRequest,
  SelectCharacterRequest,
  SelectWorldRequest,
} from "@/features/narraverse/onboarding/types";
import { analytics, AnalyticsEvent } from "@/features/narraverse/analytics/events";

/** GET — return current onboarding state */
export async function GET() {
  try {
    const ctx = await requireAuth();
    const state = onboardingService.getOrCreate(ctx.userId);

    analytics.track(AnalyticsEvent.FIRST_SESSION_STARTED, ctx.userId);

    return NextResponse.json({
      onboarding: {
        currentStep: state.currentStep,
        isFirstTime: state.isFirstTime,
        firstMessageSent: state.firstMessageSent,
        firstRelationshipCreated: state.firstRelationshipCreated,
        rewardClaimed: state.rewardClaimed,
        selectedCharacterId: state.selectedCharacterId,
        selectedWorldId: state.selectedWorldId,
        selectedWorldType: state.selectedWorldType,
        completedAt: state.completedAt,
      },
    });
  } catch (err) {
    if (err instanceof Error && "code" in err) {
      return NextResponse.json({ error: (err as { message: string }).message }, { status: 401 });
    }
    return NextResponse.json({ error: "获取状态失败" }, { status: 500 });
  }
}

/** POST — update onboarding step or make selections */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth();
    const body = await req.json();

    // Advance to a specific step
    if (body.step) {
      const { step } = UpdateOnboardingStepRequest.parse(body);
      const state = onboardingService.advanceStep(ctx.userId, step);

      analytics.track(AnalyticsEvent.ONBOARDING_STEP_ADVANCED, ctx.userId, { step });

      if (step === "complete") {
        analytics.track(AnalyticsEvent.ONBOARDING_COMPLETED, ctx.userId);
      }

      return NextResponse.json({ onboarding: state });
    }

    // Select character
    if (body.characterId) {
      const { characterId } = SelectCharacterRequest.parse(body);
      const state = onboardingService.selectCharacter(ctx.userId, characterId);

      analytics.track(AnalyticsEvent.ONBOARDING_STEP_ADVANCED, ctx.userId, {
        step: "character_select",
        characterId,
      });

      return NextResponse.json({ onboarding: state });
    }

    // Select world
    if (body.worldId !== undefined || body.worldName !== undefined) {
      const { worldId, worldName, worldType } = SelectWorldRequest.parse(body);
      const state = onboardingService.selectWorld(
        ctx.userId,
        worldId ?? "default",
        worldName ?? "叙境",
        worldType ?? "fantasy",
      );

      analytics.track(AnalyticsEvent.ONBOARDING_STEP_ADVANCED, ctx.userId, {
        step: "world_select",
        worldId,
      });

      return NextResponse.json({ onboarding: state });
    }

    return NextResponse.json({ error: "请提供 step 或 characterId 或 worldId" }, { status: 400 });
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "参数格式不正确" }, { status: 400 });
    }
    if (err instanceof Error && "code" in err) {
      return NextResponse.json({ error: (err as { message: string }).message }, { status: 401 });
    }
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}