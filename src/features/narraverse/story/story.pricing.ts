import type { WorldPackageTier } from "./story.types.js";
import type { SimilarityResult, WorldPackage } from "./story.types.js";

// ─── Star Diamond System (Product Rules §一, frozen) ─────────────────────────

/** 1 RMB = 100 星钻 */
export const STAR_DIAMOND_RATE = 100;

/** VIP Monthly: 2990 星钻 (29.9 RMB), first month 990 星钻 (9.9 RMB) */
export const VIP_MONTHLY_PRICE = 2990;
export const VIP_MONTHLY_FIRST = 990;

/** VIP Quarterly: 6990 星钻 (~77.67/3mo) */
export const VIP_QUARTERLY_PRICE = 6990;

/** VIP Annual: 19990 星钻 (~199.9/yr) */
export const VIP_ANNUAL_PRICE = 19990;

// ─── World Package Pricing (Product Rules §四, frozen) ───────────────────────

export const WORLD_PACKAGE_PRICE: Record<WorldPackageTier, number> = {
  basic: 490,
  premium: 990,
  story: 1990,
};

export const WORLD_PACKAGE_LABEL: Record<WorldPackageTier, string> = {
  basic: "基础世界",
  premium: "精品世界",
  story: "剧情世界",
};

// ─── Creator Revenue Split (Product Rules §二, frozen) ───────────────────────

export const CREATOR_REVENUE_SPLIT = 0.7;
export const PLATFORM_REVENUE_SPLIT = 0.3;

export function computeCreatorRevenue(price: number): number {
  return Math.floor(price * CREATOR_REVENUE_SPLIT);
}

export function computePlatformRevenue(price: number): number {
  return price - computeCreatorRevenue(price);
}

// ─── Trial Limits ────────────────────────────────────────────────────────────

export const TRIAL_CHAT_ROUNDS = 10;

// ─── Free User Memory Limit ──────────────────────────────────────────────────

export const FREE_USER_MEMORY_PER_CHARACTER = 200;

// ─── VIP Memory Limit ────────────────────────────────────────────────────────

export const VIP_MEMORY_PER_CHARACTER = 10000;

// ─── Ad Trigger ──────────────────────────────────────────────────────────────

/** Every N chat rounds, show an ad for free users */
export const AD_TRIGGER_ROUNDS = 200;

// ─── Character Save Limits ───────────────────────────────────────────────────

export const FREE_CHARACTER_SAVE_LIMIT = 2;
export const ADDITIONAL_SAVE_AD_COST = 0; // ad watch
export const ADDITIONAL_SAVE_STAR_COST = 200;

// ─── Copyright Protection (Product Rules §五, frozen) ────────────────────────

export const PLAGIARISM_THRESHOLD = 0.9;

export function evaluateSimilarity(score: number): SimilarityResult["verdict"] {
  if (score >= PLAGIARISM_THRESHOLD) return "reject";
  if (score >= 0.7) return "review";
  return "pass";
}

/**
 * Strip protected fields from a WorldPackage for public display.
 * Rules, Lore, Hierarchy, and advanced settings must not be shown in detail pages.
 */
export function toPublicView(world: WorldPackage): {
  id: string;
  creatorId: string;
  name: string;
  tier: WorldPackageTier;
  worldType: string;
  description: string;
  characterCount: number;
  npcCount: number;
  storyNodeCount: number;
  createdAt: number;
} {
  return {
    id: world.id,
    creatorId: world.creatorId,
    name: world.name,
    tier: world.tier,
    worldType: world.simple.worldType,
    description: world.simple.conflictMainline,
    characterCount: world.characterIds.length,
    npcCount: world.npcIds.length,
    storyNodeCount: world.storyNodeIds.length,
    createdAt: world.createdAt,
  };
}
