import { z } from "zod";

// ─── World Package Pricing (Product Rules §四, frozen) ──────────────────────

export const WorldPackageTier = z.enum(["basic", "premium", "story"]);
export type WorldPackageTier = z.infer<typeof WorldPackageTier>;

export const WORLD_PACKAGE_PRICE: Record<WorldPackageTier, number> = {
  basic: 490,
  premium: 990,
  story: 1990,
} as const;

export const WORLD_PACKAGE_LABEL: Record<WorldPackageTier, string> = {
  basic: "基础世界",
  premium: "精品世界",
  story: "剧情世界",
} as const;

// ─── World Modes ─────────────────────────────────────────────────────────────

export const WorldType = z.enum([
  "fantasy",
  "sci_fi",
  "modern",
  "historical",
  "horror",
  "romance",
  "mystery",
  "custom",
]);
export type WorldType = z.infer<typeof WorldType>;

// ─── NPC ─────────────────────────────────────────────────────────────────────

export const NpcSimple = z.object({
  id: z.string(),
  name: z.string().min(1),
  identity: z.string().min(1),
});
export type NpcSimple = z.infer<typeof NpcSimple>;

export const NpcAdvanced = z.object({
  triggerCondition: z.string(),
  storyInterventionLogic: z.string(),
});
export type NpcAdvanced = z.infer<typeof NpcAdvanced>;

export const Npc = z.object({
  id: z.string(),
  worldId: z.string(),
  name: z.string().min(1),
  identity: z.string().min(1),
  enabled: z.boolean().default(true),
  advanced: NpcAdvanced.optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Npc = z.infer<typeof Npc>;

// ─── Story Node ──────────────────────────────────────────────────────────────

export const StoryNodeStatus = z.enum(["locked", "unlocked", "completed"]);
export type StoryNodeStatus = z.infer<typeof StoryNodeStatus>;

export const StoryNode = z.object({
  id: z.string(),
  worldId: z.string(),
  order: z.number().min(0),
  title: z.string().min(1),
  description: z.string(),
  status: StoryNodeStatus.default("locked"),
  triggerCondition: z.string(),
  completionCondition: z.string(),
  dialogues: z.array(
    z.object({
      speaker: z.string(),
      content: z.string(),
    }),
  ),
  rewards: z.array(z.string()).default([]),
  createdAt: z.number(),
});
export type StoryNode = z.infer<typeof StoryNode>;

// ─── World (simple mode fields + advanced mode fields) ───────────────────────

export const WorldSimple = z.object({
  worldType: WorldType,
  relationship: z.string(),
  addressMode: z.string(),
  conflictMainline: z.string(),
});
export type WorldSimple = z.infer<typeof WorldSimple>;

export const WorldAdvanced = z.object({
  rules: z.string(),
  hierarchy: z.string(),
  lore: z.string(),
  atmosphere: z.string(),
});
export type WorldAdvanced = z.infer<typeof WorldAdvanced>;

export const WorldPackage = z.object({
  id: z.string(),
  creatorId: z.string(),
  name: z.string().min(1),
  tier: WorldPackageTier,
  simple: WorldSimple,
  advanced: WorldAdvanced.optional(),
  characterIds: z.array(z.string()),
  npcIds: z.array(z.string()),
  storyNodeIds: z.array(z.string()),
  published: z.boolean().default(false),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type WorldPackage = z.infer<typeof WorldPackage>;

// ─── World Public View (copyright: no prompt/rules/lore exposure) ────────────

export const WorldPublicView = z.object({
  id: z.string(),
  creatorId: z.string(),
  name: z.string(),
  tier: WorldPackageTier,
  worldType: WorldType,
  description: z.string(),
  characterCount: z.number(),
  npcCount: z.number(),
  storyNodeCount: z.number(),
  createdAt: z.number(),
});
export type WorldPublicView = z.infer<typeof WorldPublicView>;

// ─── World Context (injected into chat pipeline) ─────────────────────────────

export const WorldContext = z.object({
  worldId: z.string(),
  worldName: z.string(),
  worldType: WorldType,
  rules: z.string(),
  hierarchy: z.string(),
  lore: z.string(),
  atmosphere: z.string(),
  activeNpcs: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      identity: z.string(),
    }),
  ),
  currentNode: StoryNode.nullable(),
  allNodes: z.array(StoryNode),
  relationship: z.string(),
  addressMode: z.string(),
  conflictMainline: z.string(),
});
export type WorldContext = z.infer<typeof WorldContext>;

// ─── Engine Result ───────────────────────────────────────────────────────────

export const StoryEngineResult = z.object({
  worldContext: WorldContext,
  npcResponses: z.array(
    z.object({
      npcId: z.string(),
      npcName: z.string(),
      content: z.string(),
    }),
  ),
  nodeProgress: z.object({
    currentNodeId: z.string().nullable(),
    changed: z.boolean(),
    completedNodeIds: z.array(z.string()),
  }),
  worldPrompt: z.string(),
});
export type StoryEngineResult = z.infer<typeof StoryEngineResult>;

// ─── Repository Interface ────────────────────────────────────────────────────

export interface StoryRepository {
  getWorld(worldId: string): Promise<WorldPackage | null>;
  getWorldsByCreator(creatorId: string): Promise<WorldPackage[]>;
  saveWorld(world: WorldPackage): Promise<void>;
  deleteWorld(worldId: string): Promise<void>;
  getNpcs(worldId: string): Promise<Npc[]>;
  saveNpc(npc: Npc): Promise<void>;
  deleteNpc(npcId: string): Promise<void>;
  getStoryNodes(worldId: string): Promise<StoryNode[]>;
  saveStoryNode(node: StoryNode): Promise<void>;
  updateNodeStatus(nodeId: string, status: StoryNodeStatus): Promise<void>;
}

// ─── Similarity Check (Product Rules §五) ────────────────────────────────────

export const SimilarityResult = z.object({
  score: z.number().min(0).max(1),
  matchedWorldId: z.string().nullable(),
  verdict: z.enum(["pass", "review", "reject"]),
});
export type SimilarityResult = z.infer<typeof SimilarityResult>;

export interface SimilarityChecker {
  check(world: WorldPackage): Promise<SimilarityResult>;
}
