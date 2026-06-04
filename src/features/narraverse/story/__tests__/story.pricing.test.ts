import { describe, it, expect } from "vitest";
import {
  WORLD_PACKAGE_PRICE,
  computeCreatorRevenue,
  computePlatformRevenue,
  evaluateSimilarity,
  toPublicView,
  STAR_DIAMOND_RATE,
  VIP_MONTHLY_PRICE,
  VIP_MONTHLY_FIRST,
  CREATOR_REVENUE_SPLIT,
  TRIAL_CHAT_ROUNDS,
  FREE_USER_MEMORY_PER_CHARACTER,
  VIP_MEMORY_PER_CHARACTER,
  PLAGIARISM_THRESHOLD,
} from "../story.pricing.js";

describe("Pricing System", () => {
  it("has correct star diamond rate: 1 RMB = 100 star diamonds", () => {
    expect(STAR_DIAMOND_RATE).toBe(100);
  });

  it("has correct world package pricing tiers", () => {
    expect(WORLD_PACKAGE_PRICE.basic).toBe(490);
    expect(WORLD_PACKAGE_PRICE.premium).toBe(990);
    expect(WORLD_PACKAGE_PRICE.story).toBe(1990);
  });

  it("has correct VIP pricing", () => {
    expect(VIP_MONTHLY_PRICE).toBe(2990);
    expect(VIP_MONTHLY_FIRST).toBe(990);
  });

  it("computes creator revenue at 70% split", () => {
    expect(CREATOR_REVENUE_SPLIT).toBe(0.7);
    expect(computeCreatorRevenue(1000)).toBe(700);
    expect(computeCreatorRevenue(490)).toBe(343);
  });

  it("computes platform revenue at 30% split", () => {
    expect(computePlatformRevenue(1000)).toBe(300);
    expect(computePlatformRevenue(490)).toBe(147);
  });

  it("reports correct trial and memory limits", () => {
    expect(TRIAL_CHAT_ROUNDS).toBe(10);
    expect(FREE_USER_MEMORY_PER_CHARACTER).toBe(200);
    expect(VIP_MEMORY_PER_CHARACTER).toBe(10000);
  });

  it("evaluates similarity scores correctly", () => {
    expect(evaluateSimilarity(0.95)).toBe("reject");
    expect(evaluateSimilarity(0.9)).toBe("reject");
    expect(evaluateSimilarity(0.8)).toBe("review");
    expect(evaluateSimilarity(0.7)).toBe("review");
    expect(evaluateSimilarity(0.5)).toBe("pass");
  });

  it("has correct plagiarism threshold", () => {
    expect(PLAGIARISM_THRESHOLD).toBe(0.9);
  });
});

describe("toPublicView", () => {
  it("strips protected fields from world package", () => {
    const world = {
      id: "w1",
      creatorId: "c1",
      name: "Test World",
      tier: "basic" as const,
      simple: {
        worldType: "fantasy" as const,
        relationship: "friends",
        addressMode: "你",
        conflictMainline: "A great conflict",
      },
      advanced: {
        rules: "SECRET RULES",
        hierarchy: "SECRET HIERARCHY",
        lore: "SECRET LORE",
        atmosphere: "dark",
      },
      characterIds: ["char1", "char2"],
      npcIds: ["npc1"],
      storyNodeIds: ["node1", "node2", "node3"],
      published: true,
      createdAt: 1000,
      updatedAt: 2000,
    };

    const view = toPublicView(world);

    expect(view.id).toBe("w1");
    expect(view.name).toBe("Test World");
    expect(view.tier).toBe("basic");
    expect(view.characterCount).toBe(2);
    expect(view.npcCount).toBe(1);
    expect(view.storyNodeCount).toBe(3);

    // Protected fields must NOT be exposed
    expect((view as Record<string, unknown>).rules).toBeUndefined();
    expect((view as Record<string, unknown>).lore).toBeUndefined();
    expect((view as Record<string, unknown>).hierarchy).toBeUndefined();
    expect((view as Record<string, unknown>).advanced).toBeUndefined();
  });
});
