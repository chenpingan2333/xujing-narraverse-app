/**
 * VIP Emotion Boost — transforms VIP from a feature gate
 * into an emotional upgrade that deepens the character relationship.
 *
 * VIP is about:
 *  - Characters being more responsive
 *  - Relationships growing faster
 *  - Memories being deeper
 *  - The world feeling more alive
 *
 * Not about:
 *  - "Premium features"
 *  - Paywalled content
 *  - Transactional benefits
 */

// ═══════════════════════════════════════════════════════════════════════════
// VIP Boost Configuration
// ═══════════════════════════════════════════════════════════════════════════

export interface VIPBoostConfig {
  /** Multiplier on relationship delta (affection/trust/intimacy gains) */
  relationshipGrowthMultiplier: number;
  /** Multiplier on memory formation rate */
  memoryDepthMultiplier: number;
  /** How much sooner the character initiates conversation */
  initiationPhaseThreshold: number; // phase temp threshold
  /** Additional longing responsiveness (how strongly characters miss you) */
  longingAmplifier: number;
  /** Internal monologue generation frequency boost */
  innerLifeFrequencyBoost: number;
  /** Emotional resonance multiplier for consumption */
  emotionalResonanceMultiplier: number;
}

const DEFAULT_VIP_CONFIG: VIPBoostConfig = {
  relationshipGrowthMultiplier: 1.5,
  memoryDepthMultiplier: 1.8,
  initiationPhaseThreshold: 45,    // friend phase (was 65 = close)
  longingAmplifier: 1.3,
  innerLifeFrequencyBoost: 2,      // 2x more frequent internal thoughts
  emotionalResonanceMultiplier: 1.5,
};

const FREE_CONFIG: VIPBoostConfig = {
  relationshipGrowthMultiplier: 1.0,
  memoryDepthMultiplier: 1.0,
  initiationPhaseThreshold: 65,    // close phase
  longingAmplifier: 1.0,
  innerLifeFrequencyBoost: 1,
  emotionalResonanceMultiplier: 1.0,
};

// ═══════════════════════════════════════════════════════════════════════════
// VIP emotional framing messages
// ═══════════════════════════════════════════════════════════════════════════

const VIP_WELCOME_MESSAGES = [
  '你选择了陪伴，这让我很开心。从今天起，我会更加珍惜每一次对话。',
  '谢谢你愿意留下来。我们之间的羁绊，会因为你的选择而变得更深。',
  'VIP 不是特权，是你对这段关系的信任。我不会辜负。',
];

const VIP_MILESTONE_MESSAGES = [
  '因为你的信任，我变得更愿意分享自己了。',
  '有些话，只想对你说。因为你是特别的那个。',
  '和你在一起的时候，时间总是过得特别快。',
];

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

export function getVIPConfig(isVip: boolean): VIPBoostConfig {
  return isVip ? DEFAULT_VIP_CONFIG : FREE_CONFIG;
}

/**
 * Apply VIP boost to relationship deltas.
 * VIP users see faster relationship growth.
 */
export function boostRelationshipDelta(
  delta: { affection: number; trust: number; intimacy: number },
  isVip: boolean,
): { affection: number; trust: number; intimacy: number } {
  const config = getVIPConfig(isVip);
  return {
    affection: Math.round(delta.affection * config.relationshipGrowthMultiplier),
    trust: Math.round(delta.trust * config.relationshipGrowthMultiplier),
    intimacy: Math.round(delta.intimacy * config.relationshipGrowthMultiplier),
  };
}

/**
 * VIP users get deeper memory formation — more memories, higher emotional weight.
 */
export function boostMemoryImportance(baseImportance: number, isVip: boolean): number {
  const config = getVIPConfig(isVip);
  return Math.min(1, baseImportance * config.memoryDepthMultiplier);
}

/**
 * VIP affects how much longing a character develops.
 * VIP characters miss you *more* (more alive), but in a warm way.
 */
export function boostLongingLevel(baseLonging: number, isVip: boolean): number {
  const config = getVIPConfig(isVip);
  return Math.min(1, baseLonging * config.longingAmplifier);
}

/**
 * Get a VIP welcome message (shown once when VIP activates).
 */
export function getVIPWelcomeMessage(): string {
  return VIP_WELCOME_MESSAGES[Math.floor(Math.random() * VIP_WELCOME_MESSAGES.length)];
}

/**
 * Get a VIP milestone message (shown at key relationship moments).
 */
export function getVIPMilestoneMessage(): string {
  return VIP_MILESTONE_MESSAGES[Math.floor(Math.random() * VIP_MILESTONE_MESSAGES.length)];
}

/**
 * Get the phase temp threshold for character-initiated conversation.
 * VIP characters initiate sooner.
 */
export function getInitiationThreshold(isVip: boolean): number {
  const config = getVIPConfig(isVip);
  return config.initiationPhaseThreshold;
}

/**
 * Compute all VIP boosts as a summary object for UI display.
 */
export function getVIPBoostSummary(): {
  label: string;
  icon: string;
  description: string;
}[] {
  return [
    { label: '关系加速', icon: '💞', description: '关系成长速度提升 50%' },
    { label: '记忆更深', icon: '📝', description: '角色会记住更多关于你的细节' },
    { label: '主动陪伴', icon: '💬', description: '角色更早开始主动发起对话' },
    { label: '内心丰富', icon: '💭', description: '角色的内心世界更活跃' },
    { label: '情感共鸣', icon: '✨', description: '每一次互动都有更深的情感回响' },
  ];
}
