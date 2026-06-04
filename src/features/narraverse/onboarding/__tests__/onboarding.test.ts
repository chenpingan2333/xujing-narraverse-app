import { describe, it, expect, beforeEach } from "vitest";
import { onboardingService } from "../service.js";
import { canTransition, getNextStep, isPreChatStep, isComplete } from "../flow.js";
import { createDefaultOnboardingState, FIRST_MESSAGE_REWARD } from "../types.js";

describe("Onboarding Flow — State Machine", () => {
  it("welcome → character_select is valid", () => {
    expect(canTransition("welcome", "character_select")).toBe(true);
  });

  it("welcome → first_chat is invalid (must select character first)", () => {
    expect(canTransition("welcome", "first_chat")).toBe(false);
  });

  it("character_select → world_select is valid", () => {
    expect(canTransition("character_select", "world_select")).toBe(true);
  });

  it("character_select → first_chat is valid (world is skippable)", () => {
    expect(canTransition("character_select", "first_chat")).toBe(true);
  });

  it("world_select → first_chat is valid", () => {
    expect(canTransition("world_select", "first_chat")).toBe(true);
  });

  it("first_chat → complete is valid", () => {
    expect(canTransition("first_chat", "complete")).toBe(true);
  });

  it("complete has no transitions", () => {
    expect(canTransition("complete", "welcome")).toBe(false);
    expect(canTransition("complete", "first_chat")).toBe(false);
  });

  it("getNextStep returns the correct next step", () => {
    expect(getNextStep("welcome")).toBe("character_select");
    expect(getNextStep("character_select")).toBe("world_select");
    expect(getNextStep("first_chat")).toBe("complete");
    expect(getNextStep("complete")).toBeNull();
  });

  it("isPreChatStep identifies pre-chat steps", () => {
    expect(isPreChatStep("welcome")).toBe(true);
    expect(isPreChatStep("character_select")).toBe(true);
    expect(isPreChatStep("world_select")).toBe(true);
    expect(isPreChatStep("first_chat")).toBe(false);
    expect(isPreChatStep("complete")).toBe(false);
  });
});

describe("OnboardingService", () => {
  beforeEach(() => {
    onboardingService.reset("test-user");
  });

  it("creates default state for new user", () => {
    const state = onboardingService.getOrCreate("test-user");
    expect(state.currentStep).toBe("welcome");
    expect(state.isFirstTime).toBe(true);
    expect(state.firstMessageSent).toBe(false);
    expect(state.rewardClaimed).toBe(false);
  });

  it("advances through valid steps", () => {
    onboardingService.advanceStep("test-user", "character_select");
    onboardingService.advanceStep("test-user", "world_select");
    onboardingService.advanceStep("test-user", "first_chat");
    const state = onboardingService.advanceStep("test-user", "complete");
    expect(state.currentStep).toBe("complete");
    expect(state.completedAt).toBeGreaterThan(0);
  });

  it("throws on invalid transition", () => {
    expect(() => onboardingService.advanceStep("test-user", "first_chat")).toThrow();
  });

  it("selectCharacter advances to world_select", () => {
    const state = onboardingService.selectCharacter("test-user", "char-001");
    expect(state.currentStep).toBe("world_select");
    expect(state.selectedCharacterId).toBe("char-001");
  });

  it("markFirstMessageSent is idempotent", () => {
    const s1 = onboardingService.markFirstMessageSent("test-user");
    expect(s1.firstMessageSent).toBe(true);
    const s2 = onboardingService.markFirstMessageSent("test-user");
    expect(s2.firstMessageSent).toBe(true);
  });

  it("claimFirstReward prevents double claim", () => {
    onboardingService.markFirstMessageSent("test-user");
    const s1 = onboardingService.claimFirstReward("test-user");
    expect(s1.rewardClaimed).toBe(true);
    const s2 = onboardingService.claimFirstReward("test-user");
    expect(s2.rewardClaimed).toBe(true);
    expect(s1).toEqual(s2); // Should return same state without changes
  });

  it("isEligibleForFirstReward works correctly", () => {
    expect(onboardingService.isEligibleForFirstReward("test-user")).toBe(true);
    onboardingService.markFirstMessageSent("test-user");
    expect(onboardingService.isEligibleForFirstReward("test-user")).toBe(true);
    onboardingService.claimFirstReward("test-user");
    expect(onboardingService.isEligibleForFirstReward("test-user")).toBe(false);
  });
});

describe("First Engagement Reward", () => {
  it("has positive relationship deltas", () => {
    expect(FIRST_MESSAGE_REWARD.affection).toBeGreaterThan(0);
    expect(FIRST_MESSAGE_REWARD.trust).toBeGreaterThan(0);
    expect(FIRST_MESSAGE_REWARD.intimacy).toBeGreaterThan(0);
  });

  it("has a meaningful reason message", () => {
    expect(FIRST_MESSAGE_REWARD.reason.length).toBeGreaterThan(10);
  });
});

describe("createDefaultOnboardingState", () => {
  it("creates state with provided userId", () => {
    const state = createDefaultOnboardingState("user-abc");
    expect(state.userId).toBe("user-abc");
    expect(state.currentStep).toBe("welcome");
    expect(state.isFirstTime).toBe(true);
    expect(state.completedAt).toBeNull();
  });
});
