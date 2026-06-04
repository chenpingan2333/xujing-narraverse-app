import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { onboardingService } from "@/features/narraverse/onboarding/service";
import { FIRST_MESSAGE_REWARD } from "@/features/narraverse/onboarding/types";
import { analytics, AnalyticsEvent } from "@/features/narraverse/analytics/events";
import { InMemoryStore } from "@/features/narraverse/memory/memory-store.testdoubles";
import { TieredMemoryStore } from "@/features/narraverse/memory/index.js";
import { InMemoryChatRepository } from "@/features/narraverse/chat/chat.repository";
import { runChat } from "@/features/narraverse/chat/chat.runtime";
import { InMemoryApiKeyRepository, InMemoryUsageRepository } from "@/features/narraverse/provider/provider.repos";
import { NarraverseRouter } from "@/features/narraverse/provider/router";
import { ProviderGateway } from "@/features/narraverse/provider/provider.gateway";
import { DeepSeekProvider } from "@/features/narraverse/provider/providers/provider-impls";
import type { ProviderId, LLMProvider } from "@/features/narraverse/provider/provider.types";
import { STAR_DIAMOND_RATE } from "@/features/narraverse/payment/payment.types";
import { buildPersonaFingerprint } from "@/features/narraverse/persona/persona.builder";
import { userQuotaService, AD_TURN_INTERVAL, AD_REWARD_CONVERSATION, AdCooldownError } from "@/features/narraverse/user/quota";
import { buildFinalSystemPrompt } from "@/features/narraverse/chat/system-prompt-builder";

function buildGateway(): ProviderGateway {
  const apiKeyRepo = new InMemoryApiKeyRepository();
  const usageRepo = new InMemoryUsageRepository();
  const encryptionKey = process.env["API_KEY_ENCRYPTION_KEY"] ?? "dev-32-char-key-xxxxxxxxxxxxxxxx";
  const router = new NarraverseRouter({
    defaultFreeModel: "deepseek", defaultVipModel: "deepseek", premiumModel: "grok",
    encryptionKey, apiKeyRepo,
  });
  const platformProviders = new Map<ProviderId, LLMProvider>();
  if (process.env["DEEPSEEK_API_KEY"]) {
    platformProviders.set("deepseek", new DeepSeekProvider(
      process.env["DEEPSEEK_API_KEY"],
      process.env["DEEPSEEK_BASE_URL"] ?? "https://api.deepseek.com",
      process.env["DEEPSEEK_MODEL"] ?? "deepseek-chat",
    ));
  }
  return new ProviderGateway({ platformProviders, apiKeyRepo, usageRepo, router, encryptionKey });
}

const DEFAULT_CHARACTERS: Record<string, { name: string; persona: string }> = {
  "char-001": { name: "鑹剧惓", persona: "娓╂煍浣撹创鐨勯偦瀹跺コ瀛╋紝鍠滄鍒嗕韩鏃ュ父鐢熸椿涓殑灏忕‘骞? },
  "char-002": { name: "闆锋仼", persona: "鍕囨暍姝ｇ洿鐨勫啋闄╄€咃紝鎬昏兘鍦ㄥ嵄闄╀腑淇濇姢浣? },
  "char-003": { name: "澧ㄥ", persona: "绁炵楂樺喎鐨勫墤瀹紝璇濅笉澶氫絾姣忓彞閮芥湁娣辨剰" },
};

function sanitizeError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    // Provider / auth failures
    if (/provider|api.?key|401|403|unauthoriz|forbidden/i.test(msg))
      return "AI 鏈嶅姟鏆傛椂涓嶅彲鐢紝璇风◢鍚庨噸璇?;
    // Crypto / key management failures
    if (/encrypt|decrypt|key/i.test(msg))
      return "绯荤粺閰嶇疆閿欒锛岃鑱旂郴绠＄悊鍛?;
    // Leaked stack traces or filesystem paths 鈥?replace with generic
    if (/at\s+(async\s+)?\S+\s+\(.+:\d+:\d+\)|\\src\\|\\node_modules\\|\/src\/|\/node_modules\//.test(msg))
      return "鏈嶅姟寮傚父锛岃绋嶅悗閲嶈瘯";
    return "鏈嶅姟寮傚父锛岃绋嶅悗閲嶈瘯";
  }
  return "鏈嶅姟寮傚父锛岃绋嶅悗閲嶈瘯";
}


export async function GET() {
  return NextResponse.json({ ok: true });
}export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, characterId, message, sessionId, isVip, characterTier, worldId, worldTier, worldType } = body;

    if (!userId || !characterId || !message) {
      return NextResponse.json({ error: "璇峰～鍐欏繀瑕佷俊鎭? }, { status: 400 });
    }
    if (typeof message !== "string" || message.length === 0) {
      return NextResponse.json({ error: "娑堟伅涓嶈兘涓虹┖" }, { status: 400 });
    }
    if (message.length > 4000) {
      return NextResponse.json({ error: "娑堟伅杩囬暱锛岃绮剧畝鍚庨噸璇? }, { status: 400 });
    }

    // Auth: override userId from session (prevents client-side spoofing)
    let effectiveUserId = userId;
    let effectiveIsVip = isVip ?? false;
    try {
      const authCtx = await requireAuth();
      effectiveUserId = authCtx.userId;
      effectiveIsVip = authCtx.user.isVip;
    } catch {
      // Allow unauthenticated for dev (production uses middleware redirect)
    }



    // 鈹€鈹€ Onboarding: check first-time state 鈹€鈹€
    // 鈹€鈹€ P0-2: Ad trigger check 鈹€鈹€
    const adWatched = body._adWatched === true;
    if (!adWatched) {
      const needsAd = await userQuotaService.needsAdForConversation(effectiveUserId, effectiveIsVip);
      if (needsAd) {
        return NextResponse.json({
          _adRequired: true,
          _adType: "conversation_continue",
          _adReward: AD_REWARD_CONVERSATION,
          _currentTurns: await userQuotaService.getConversationTurns(effectiveUserId),
        }, { status: 200 });
      }
    } else {
      try { await userQuotaService.logAdWatch(effectiveUserId, "conversation_continue"); } catch (e) { if (e instanceof AdCooldownError) { return NextResponse.json({ _adCooldown: true, _remainingSeconds: e.remainingSeconds }, { status: 200 }); } throw e; }
    }

        const onboardingState = onboardingService.getOrCreate(effectiveUserId);
    const isFirstMessage = onboardingState.isFirstTime && !onboardingState.firstMessageSent;

    const charInfo = DEFAULT_CHARACTERS[characterId] ?? { name: "瑙掕壊", persona: "A helpful companion" };

    // Build persona fingerprint
    const personaFP = buildPersonaFingerprint({
      name: charInfo.name,
      persona: charInfo.persona,
      tier: (characterTier as "basic" | "premium" | "story") ?? "basic",
      relationshipAffection: 50,
      relationshipTrust: 50,
      relationshipIntimacy: 50,
    });

    const baseMemoryStore = new InMemoryStore();
    const memoryStore = new TieredMemoryStore(baseMemoryStore, () => effectiveIsVip);
    const chatRepository = new InMemoryChatRepository();
    const providerGateway = buildGateway();

    const characterService = {
      getCharacter: async () => ({
        id: characterId, userId: effectiveUserId, name: charInfo.name, persona: charInfo.persona,
        description: "", config: {},
      }),
    };

    const relationshipService = {
      getRelationship: async () => ({
        userId: effectiveUserId, characterId, affection: 50, trust: 50, intimacy: 50, status: "active",
      }),
      updateRelationship: async () => ({
        userId: effectiveUserId, characterId, affection: 50, trust: 50, intimacy: 50, status: "active",
      }),
    };

    // Unified system prompt builder 鈥?merges persona + world + memory + liveness + relationship
    const promptBuilder = {
      buildPrompt: async (params: { character: { name: string; persona: string }; message: string }) => {
        const result = buildFinalSystemPrompt({
          persona: personaFP,
          personaCtx: { intimacy: 50, worldType },
          character: { id: characterId, userId: effectiveUserId, name: charInfo.name, persona: charInfo.persona, description: "", config: {} },
          relationship: { userId: effectiveUserId, characterId, affection: 50, trust: 50, intimacy: 50, status: "active" },
          includeLiveness: false,
          isVip: effectiveIsVip,
        });
        return {
          systemPrompt: result.systemPrompt,
          userPrompt: params.message,
          messages: [
            { role: "system" as const, content: result.systemPrompt },
            { role: "user" as const, content: params.message },
          ],
        };
      },
    };

    // 鈹€鈹€ First-time message injection 鈹€鈹€
    // 鈹€鈹€ First-time message injection 鈹€鈹€
    const effectiveMessage = isFirstMessage
      ? "[杩欐槸浣犱滑绗竴娆″璇濄€傝鐢ㄦ俯鏌斻€佺暐甯﹀ソ濂囩殑璇皵涓诲姩鍚戝鏂规墦鎷涘懠锛岀畝鍗曚粙缁嶈嚜宸憋紝骞堕個璇峰鏂硅璇存兂鑱婁粈涔堛€備綘鐨勫洖绛斿簲璇ヨ浜烘劅鍒板畨蹇冨拰琚湡寰呫€俔\n\n" + message
      : message;
    const effectiveIsVipForRuntime = effectiveIsVip;
    const result = await runChat(
      { characterService, relationshipService, promptBuilder, providerGateway, memoryStore, chatRepository },
      { userId: effectiveUserId, characterId, message: effectiveMessage, sessionId: sessionId ?? `sess-${Date.now()}`, isVip: isVip ?? false, characterTier, worldTier },
    );


    // 鈹€鈹€ Increment conversation turns 鈹€鈹€
    await userQuotaService.increment(effectiveUserId, "conversation_turn");

        // 鈹€鈹€ First engagement reward 鈹€鈹€
    let boostedDelta = result.relationshipDelta;
    if (isFirstMessage && onboardingService.isEligibleForFirstReward(effectiveUserId)) {
      boostedDelta = {
        affection: result.relationshipDelta.affection + FIRST_MESSAGE_REWARD.affection,
        trust: result.relationshipDelta.trust + FIRST_MESSAGE_REWARD.trust,
        intimacy: result.relationshipDelta.intimacy + FIRST_MESSAGE_REWARD.intimacy,
        reason: FIRST_MESSAGE_REWARD.reason,
      };
      onboardingService.markFirstMessageSent(effectiveUserId);
      onboardingService.claimFirstReward(effectiveUserId);
      analytics.track(AnalyticsEvent.FIRST_MESSAGE_SENT, effectiveUserId, { characterId });
      analytics.track(AnalyticsEvent.FIRST_RELATIONSHIP_CREATED, effectiveUserId);
      analytics.track(AnalyticsEvent.FIRST_REWARD_CLAIMED, effectiveUserId);
    } else if (isFirstMessage) {
      onboardingService.markFirstMessageSent(effectiveUserId);
      analytics.track(AnalyticsEvent.FIRST_MESSAGE_SENT, effectiveUserId, { characterId });
    }

    const inputTokens = result.metadata?.inputTokens ?? 0;
    const outputTokens = result.metadata?.outputTokens ?? 0;
    const starCost = Math.max(1, Math.ceil((inputTokens + outputTokens) / STAR_DIAMOND_RATE));
    const currentTurns = await userQuotaService.getConversationTurns(effectiveUserId);
    const turnsUntilNextAd = AD_TURN_INTERVAL - (currentTurns % AD_TURN_INTERVAL);

    return NextResponse.json({
      reply: result.assistantMessage,
      relationshipDelta: boostedDelta,
      memoryEvents: result.memoryEvents,
      metadata: { ...result.metadata, starCost, isFirstMessage, onboardingComplete: onboardingState.currentStep === "complete" || (isFirstMessage && onboardingService.isEligibleForFirstReward(effectiveUserId)), conversationTurns: currentTurns, turnsUntilNextAd },
    });
  } catch (err) {
    console.error("Chat API error:", err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200));
    return NextResponse.json({ error: sanitizeError(err) }, { status: 500 });
  }
}
