// Types
export {
  WorldPackageTier,
  WorldType,
  type WorldPackage,
  type WorldSimple,
  type WorldAdvanced,
  type WorldPublicView,
  type WorldContext,
  type Npc,
  type NpcSimple,
  type NpcAdvanced,
  type StoryNode,
  type StoryNodeStatus,
  type StoryEngineResult,
  type StoryRepository,
  type SimilarityResult,
  type SimilarityChecker,
  WorldPackage as WorldPackageSchema,
  WorldSimple as WorldSimpleSchema,
  WorldAdvanced as WorldAdvancedSchema,
  WorldPublicView as WorldPublicViewSchema,
  WorldContext as WorldContextSchema,
  Npc as NpcSchema,
  StoryNode as StoryNodeSchema,
  StoryEngineResult as StoryEngineResultSchema,
  WORLD_PACKAGE_PRICE,
  WORLD_PACKAGE_LABEL,
} from "./story.types.js";

// Pricing & copyright
export {
  STAR_DIAMOND_RATE,
  VIP_MONTHLY_PRICE,
  VIP_MONTHLY_FIRST,
  VIP_QUARTERLY_PRICE,
  VIP_ANNUAL_PRICE,
  CREATOR_REVENUE_SPLIT,
  PLATFORM_REVENUE_SPLIT,
  TRIAL_CHAT_ROUNDS,
  FREE_USER_MEMORY_PER_CHARACTER,
  VIP_MEMORY_PER_CHARACTER,
  AD_TRIGGER_ROUNDS,
  FREE_CHARACTER_SAVE_LIMIT,
  ADDITIONAL_SAVE_STAR_COST,
  PLAGIARISM_THRESHOLD,
  computeCreatorRevenue,
  computePlatformRevenue,
  evaluateSimilarity,
  toPublicView,
} from "./story.pricing.js";

// Templates (DeepSeek cache optimized)
export {
  buildWorldSystemPrompt,
  buildNpcInterventionPrompt,
  buildNodeTransitionPrompt,
  buildWorldPrompt,
} from "./story.templates.js";

// World management
export {
  createWorld,
  updateWorldSimple,
  updateWorldAdvanced,
  publishWorld,
  unpublishWorld,
  buildWorldContext,
  loadWorldWithContext,
} from "./story.world.js";

// NPC management
export {
  createNpc,
  updateNpcSimple,
  updateNpcAdvanced,
  enableNpc,
  disableNpc,
  checkNpcTrigger,
  getTriggeredNpcs,
} from "./story.npc.js";

// Story nodes
export {
  createStoryNode,
  checkNodeCompletion,
  progressStory,
  isStoryComplete,
  getCurrentNode,
} from "./story.node.js";

// Engine
export { StoryEngine } from "./story.engine.js";

// Repository
export { InMemoryStoryRepository } from "./story.repository.js";

// Service
export { StoryService } from "./story.service.js";

