import { describe, it, expect, beforeEach } from "vitest";
import { customCharacterService } from "../../characters/service.js";
import { onboardingService } from "../../onboarding/service.js";
import { checkRateLimit } from "../../../../lib/auth/rate-limiter.js";
import { FIRST_MESSAGE_REWARD } from "../../onboarding/types.js";

// Helper: minimal character params matching full CreateCharacterInput shape
const mk = (name: string, persona: string) => ({
  name, persona, description: "", tier: "basic" as const, avatar: "?", worldId: null as string | null,
});

describe("Beta Flow — Invite → Character → First Chat", () => {
  const TEST_USER = "beta-user-1";

  beforeEach(() => {
    customCharacterService.reset();
    onboardingService.reset(TEST_USER);
  });

  it("step 1: rate limiter allows normal redemption attempts", () => {
    for (let i = 0; i < 3; i++) {
      const r = checkRateLimit(`invite-redeem:${TEST_USER}`, 5, 10 * 60_000);
      expect(r.allowed).toBe(true);
    }
  });

  it("step 2: user creates a custom character after invite", () => {
    const c = customCharacterService.create(TEST_USER, {
      name: "My First Character",
      persona: "A brave knight from the northern lands",
      description: "",
      tier: "basic",
      avatar: "??",
      worldId: null,
    });
    expect(c.id).toBeTruthy();
    expect(c.name).toBe("My First Character");
    expect(c).not.toHaveProperty("userId");
  });

  it("step 3: onboarding starts at welcome for new user", () => {
    const state = onboardingService.getOrCreate(TEST_USER);
    expect(state.currentStep).toBe("welcome");
    expect(state.isFirstTime).toBe(true);
    expect(state.firstMessageSent).toBe(false);
  });

  it("step 4: user selects character during onboarding", () => {
    const c = customCharacterService.create(TEST_USER, {
      name: "Onboarding Char",
      persona: "A test persona for onboarding",
      description: "",
      tier: "basic",
      avatar: "?",
      worldId: null,
    });
    const state = onboardingService.selectCharacter(TEST_USER, c.id);
    expect(state.currentStep).toBe("world_select");
    expect(state.selectedCharacterId).toBe(c.id);
  });

  it("step 5: first message triggers reward eligibility", () => {
    expect(onboardingService.isEligibleForFirstReward(TEST_USER)).toBe(true);

    onboardingService.markFirstMessageSent(TEST_USER);
    expect(onboardingService.isEligibleForFirstReward(TEST_USER)).toBe(true);

    onboardingService.claimFirstReward(TEST_USER);
    expect(onboardingService.isEligibleForFirstReward(TEST_USER)).toBe(false);
  });

  it("step 6: first message reward has correct magnitudes", () => {
    expect(FIRST_MESSAGE_REWARD.affection).toBe(8);
    expect(FIRST_MESSAGE_REWARD.trust).toBe(6);
    expect(FIRST_MESSAGE_REWARD.intimacy).toBe(6);
    expect(FIRST_MESSAGE_REWARD.reason.length).toBeGreaterThan(10);
  });

  it("step 7: character list respects user isolation", () => {
    customCharacterService.create(TEST_USER, mk("A", "PA"));
    customCharacterService.create(TEST_USER, mk("B", "PB"));
    customCharacterService.create("another-user", mk("X", "PX"));

    const myChars = customCharacterService.list(TEST_USER);
    expect(myChars).toHaveLength(2);
  });

  it("step 8: full onboarding completes correctly", () => {
    onboardingService.advanceStep(TEST_USER, "character_select");
    onboardingService.advanceStep(TEST_USER, "world_select");
    onboardingService.advanceStep(TEST_USER, "first_chat");

    onboardingService.markFirstMessageSent(TEST_USER);
    const final = onboardingService.claimFirstReward(TEST_USER);

    expect(final.currentStep).toBe("complete");
    expect(final.rewardClaimed).toBe(true);
    expect(final.completedAt).toBeGreaterThan(0);
    expect(onboardingService.isOnboarded(TEST_USER)).toBe(true);
  });
});

describe("Beta Flow — Edge Cases", () => {
  const TEST_USER = "beta-edge-user";

  beforeEach(() => {
    customCharacterService.reset();
    onboardingService.reset(TEST_USER);
  });

  it("cannot advance onboarding past complete", () => {
    onboardingService.advanceStep(TEST_USER, "character_select");
    onboardingService.advanceStep(TEST_USER, "world_select");
    onboardingService.advanceStep(TEST_USER, "first_chat");
    onboardingService.claimFirstReward(TEST_USER);

    expect(() => onboardingService.advanceStep(TEST_USER, "welcome")).toThrow();
  });

  it("deleted characters are not listable", () => {
    const c = customCharacterService.create(TEST_USER, mk("Temp", "T"));
    expect(customCharacterService.list(TEST_USER)).toHaveLength(1);
    customCharacterService.delete(TEST_USER, c.id);
    expect(customCharacterService.list(TEST_USER)).toHaveLength(0);
  });

  it("onboarding reset allows fresh start", () => {
    onboardingService.advanceStep(TEST_USER, "character_select");
    onboardingService.reset(TEST_USER);
    const state = onboardingService.getOrCreate(TEST_USER);
    expect(state.currentStep).toBe("welcome");
  });

  it("reward is idempotent across multiple calls", () => {
    onboardingService.markFirstMessageSent(TEST_USER);
    const first = onboardingService.claimFirstReward(TEST_USER);
    const second = onboardingService.claimFirstReward(TEST_USER);
    expect(first.rewardClaimed).toBe(true);
    expect(second.rewardClaimed).toBe(true);
  });
});
