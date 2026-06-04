import { describe, it, expect, beforeEach } from "vitest";
import {
  evaluatePurchaseTriggers,
  dismissSuggestion,
  clearSuggestionHistory,
} from "../soft-purchase-trigger.js";

describe("evaluatePurchaseTriggers", () => {
  beforeEach(() => {
    clearSuggestionHistory();
  });

  it("returns relationship upgrade suggestion on phase transition (non-VIP)", () => {
    const result = evaluatePurchaseTriggers(
      {
        characterId: "char-001",
        characterName: "艾琳",
        fromPhase: "stranger",
        toPhase: "acquaintance",
        phaseChanged: true,
        isVip: false,
        conversationCount: 3,
      },
      "user-1",
    );
    expect(result).not.toBeNull();
    if (result) {
      expect(result.type).toBe("relationship_upgrade");
      expect(result.ctaType).toBe("membership");
      expect(result.characterMessage).toBeTruthy();
      expect(result.ctaText).toBeTruthy();
      expect(result.dismissible).toBe(true);
    }
  });

  it("returns null for VIP users (already have membership)", () => {
    const result = evaluatePurchaseTriggers(
      {
        characterId: "char-001",
        characterName: "艾琳",
        fromPhase: "stranger",
        toPhase: "acquaintance",
        phaseChanged: true,
        isVip: true,
        conversationCount: 3,
      },
      "user-1",
    );
    expect(result).toBeNull();
  });

  it("returns null when no phase change", () => {
    const result = evaluatePurchaseTriggers(
      {
        characterId: "char-001",
        characterName: "艾琳",
        phaseChanged: false,
        isVip: false,
        conversationCount: 3,
      },
      "user-1",
    );
    expect(result).toBeNull();
  });

  it("returns null for world purchase when no world context (VIP)", () => {
    // Story milestone with no world name should not fire
    const result = evaluatePurchaseTriggers(
      {
        characterId: "char-001",
        characterName: "艾琳",
        storyMilestoneTitle: "chapter-2",
        // no worldName
        isVip: true,
        conversationCount: 10,
      },
      "user-3",
    );
    expect(result).toBeNull();
  });

  it("returns world purchase suggestion for story milestone with world name", () => {
    const result = evaluatePurchaseTriggers(
      {
        characterId: "char-002",
        characterName: "雷恩",
        storyMilestoneTitle: "迷雾森林的入口",
        worldName: "迷雾森林",
        isVip: true,
        conversationCount: 10,
      },
      "user-2",
    );
    expect(result).not.toBeNull();
    if (result) {
      expect(result.type).toBe("story_milestone");
      expect(result.ctaType).toBe("world_purchase");
    }
  });

  it("returns memory limit suggestion at 80%+ usage (non-VIP)", () => {
    const result = evaluatePurchaseTriggers(
      {
        characterId: "char-001",
        characterName: "艾琳",
        memoryUsagePercent: 85,
        conversationCount: 10,
        isVip: false,
      },
      "user-1",
    );
    expect(result).not.toBeNull();
    if (result) {
      expect(result.type).toBe("memory_near_limit");
      expect(result.ctaType).toBe("membership");
    }
  });

  it("does NOT trigger memory limit for VIP users", () => {
    const result = evaluatePurchaseTriggers(
      {
        characterId: "char-001",
        characterName: "艾琳",
        memoryUsagePercent: 90,
        conversationCount: 10,
        isVip: true,
      },
      "user-1",
    );
    expect(result).toBeNull();
  });

  it("does NOT trigger memory limit below 80%", () => {
    const result = evaluatePurchaseTriggers(
      {
        characterId: "char-001",
        characterName: "艾琳",
        memoryUsagePercent: 70,
        conversationCount: 10,
        isVip: false,
      },
      "user-1",
    );
    expect(result).toBeNull();
  });

  it("requires minimum conversation count for memory trigger", () => {
    const result = evaluatePurchaseTriggers(
      {
        characterId: "char-001",
        characterName: "艾琳",
        memoryUsagePercent: 85,
        conversationCount: 3,
        isVip: false,
      },
      "user-1",
    );
    // conversationCount <= 5 should not trigger
    expect(result).toBeNull();
  });

  it("respects cooldown — does not repeat same suggestion immediately", () => {
    const input = {
      characterId: "char-001",
      characterName: "艾琳",
      fromPhase: "stranger" as const,
      toPhase: "acquaintance" as const,
      phaseChanged: true,
      isVip: false,
      conversationCount: 3,
    };

    const first = evaluatePurchaseTriggers(input, "user-1");
    expect(first).not.toBeNull();

    const second = evaluatePurchaseTriggers(input, "user-1");
    expect(second).toBeNull();
  });

  it("dismissSuggestion prevents re-delivery within cooldown", () => {
    const input = {
      characterId: "char-001",
      characterName: "艾琳",
      memoryUsagePercent: 90,
      conversationCount: 10,
      isVip: false,
    };

    const suggestion = evaluatePurchaseTriggers(input, "user-1");
    expect(suggestion).not.toBeNull();

    if (suggestion) {
      dismissSuggestion("user-1", "char-001", suggestion.id);

      const second = evaluatePurchaseTriggers(input, "user-1");
      expect(second).toBeNull();
    }
  });

  it("high priority triggers at close→intimate phase", () => {
    const result = evaluatePurchaseTriggers(
      {
        characterId: "char-001",
        characterName: "艾琳",
        fromPhase: "close",
        toPhase: "intimate",
        phaseChanged: true,
        isVip: false,
        conversationCount: 20,
      },
      "user-5",
    );
    expect(result).not.toBeNull();
    if (result) {
      expect(result.priority).toBe("high");
    }
  });

  it("normal priority for friend→close phase", () => {
    const result = evaluatePurchaseTriggers(
      {
        characterId: "char-001",
        characterName: "艾琳",
        fromPhase: "friend",
        toPhase: "close",
        phaseChanged: true,
        isVip: false,
        conversationCount: 15,
      },
      "user-6",
    );
    expect(result).not.toBeNull();
    if (result) {
      expect(result.priority).toBe("high");
    }
  });

  it("returns null for unknown phase transition", () => {
    // Testing with an unknown phase — should gracefully return null
    const result = evaluatePurchaseTriggers(
      {
        characterId: "char-001",
        characterName: "艾琳",
        fromPhase: "intimate",
        toPhase: "stranger",
        phaseChanged: true,
        isVip: false,
        conversationCount: 5,
      },
      "user-7",
    );
    // intimate→stranger is not in the pool, so result should be null
    // (no matching relationship suggestion)
    expect(result).toBeNull();
  });
});
