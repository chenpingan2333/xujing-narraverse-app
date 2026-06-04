/**
 * Relationship Momentum — natural decay, trend tracking, and chat-frequency
 * analysis for the relationship system.
 *
 * This module is an enhancement layer. It does NOT modify:
 *  - evolution-engine.ts (core state machine)
 *  - event-trigger.ts (milestone detection)
 *  - milestones.ts (phase definitions)
 *
 * It adds:
 *  1. Natural decay of affection/trust/intimacy during silence
 *  2. Relationship trend tracking (rising / stable / declining)
 *  3. Chat frequency analysis for decay moderation
 *  4. Silence-duration → relationship impact mapping
 */

// ===========================================================================
// Types
// ===========================================================================

/** Overall relationship trajectory over recent interactions. */
export type RelationshipTrend = "rising" | "stable" | "declining";

/** Per-dimension trend labels used for detailed introspection. */
export type DimensionTrend = "rising" | "stable" | "declining";

export interface MomentumConfig {
  /** Affection decay points per day of silence (0-100 scale). */
  affectionDecayPerDay: number;
  /** Trust decay points per day of silence, only after grace period. */
  trustDecayPerDay: number;
  /** Number of silence days before trust starts decaying. */
  trustDecayGraceDays: number;
  /** Intimacy decay points per day of silence. */
  intimacyDecayPerDay: number;
  /** Multiplier applied to all decay rates for VIP users (< 1 = slower decay). */
  vipDecayMultiplier: number;
  /** Minimum chat frequency (per day) below which decay accelerates. */
  lowFrequencyThreshold: number;
  /** Additional decay multiplier when chat frequency is below threshold. */
  lowFrequencyDecayBoost: number;
}

const DEFAULT_CONFIG: MomentumConfig = {
  affectionDecayPerDay: 1.5,
  trustDecayPerDay: 0.5,
  trustDecayGraceDays: 3,
  intimacyDecayPerDay: 2,
  vipDecayMultiplier: 0.5,
  lowFrequencyThreshold: 0.3,
  lowFrequencyDecayBoost: 1.5,
};

// ===========================================================================
// Input / Output
// ===========================================================================

export interface MomentumInput {
  currentAffection: number;
  currentTrust: number;
  currentIntimacy: number;
  daysSinceLastInteraction: number;
  /** Average chats per day over the last 7 days. 0 = no recent activity. */
  chatFrequency: number;
  /** Emotional intensity of the most recent interaction (0-1). */
  emotionalIntensity: number;
  isVip: boolean;
  /** Previous snapshot for trend comparison. */
  previousValues?: { affection: number; trust: number; intimacy: number };
}

export interface MomentumResult {
  newAffection: number;
  newTrust: number;
  newIntimacy: number;
  decayApplied: boolean;
  overallTemp: number;
  trend: RelationshipTrend;
  trendDetails: {
    affectionTrend: DimensionTrend;
    trustTrend: DimensionTrend;
    intimacyTrend: DimensionTrend;
  };
  /** Human-readable Chinese summary for prompt injection. */
  contextSummary: string;
}

// ===========================================================================
// Core: computeRelationshipMomentum
// ===========================================================================

export function computeRelationshipMomentum(
  input: MomentumInput,
  config: Partial<MomentumConfig> = {},
): MomentumResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  let affection = input.currentAffection;
  let trust = input.currentTrust;
  let intimacy = input.currentIntimacy;
  let decayApplied = false;

  const days = input.daysSinceLastInteraction;

  // ── Phase 1: Decay during silence ──────────────────────────────────
  if (days > 1) {
    const isLowFreq = input.chatFrequency < cfg.lowFrequencyThreshold;
    const freqBoost = isLowFreq ? cfg.lowFrequencyDecayBoost : 1;
    const vipFactor = input.isVip ? cfg.vipDecayMultiplier : 1;

    // Affection: decays linearly with silence
    const affDecay = cfg.affectionDecayPerDay * days * freqBoost * vipFactor;
    affection = clamp(affection - affDecay, 0, 100);

    // Trust: decays only after grace period
    if (days > cfg.trustDecayGraceDays) {
      const trustDays = days - cfg.trustDecayGraceDays;
      const trustDecay = cfg.trustDecayPerDay * trustDays * vipFactor;
      trust = clamp(trust - trustDecay, 0, 100);
    }

    // Intimacy: fades fastest with absence
    const intDecay = cfg.intimacyDecayPerDay * days * freqBoost * vipFactor;
    intimacy = clamp(intimacy - intDecay, 0, 100);

    decayApplied = true;
  }

  // ── Phase 2: Growth from active emotional interaction ──────────────
  if (days < 1 && input.emotionalIntensity > 0) {
    const intensity = input.emotionalIntensity;
    affection = clamp(affection + intensity * 0.8, 0, 100);
    trust = clamp(trust + intensity * 0.3, 0, 100);
    intimacy = clamp(intimacy + intensity * 0.6, 0, 100);
  }

  // Round to integers for clean display
  affection = Math.round(affection);
  trust = Math.round(trust);
  intimacy = Math.round(intimacy);

  const overallTemp = Math.round((affection + trust + intimacy) / 3);
  const trend = determineTrend(input, { affection, trust, intimacy });
  const trendDetails = getDimensionTrends(input, { affection, trust, intimacy });
  const contextSummary = buildContextSummary(trend, decayApplied, days, input.isVip);

  return {
    newAffection: affection,
    newTrust: trust,
    newIntimacy: intimacy,
    decayApplied,
    overallTemp,
    trend,
    trendDetails,
    contextSummary,
  };
}

// ===========================================================================
// Trend Detection
// ===========================================================================

function determineTrend(
  input: MomentumInput,
  current: { affection: number; trust: number; intimacy: number },
): RelationshipTrend {
  if (!input.previousValues) return "stable";

  const prev = input.previousValues;
  const avgChange =
    (current.affection - prev.affection +
     current.trust - prev.trust +
     current.intimacy - prev.intimacy) / 3;

  if (avgChange > 1.5) return "rising";
  if (avgChange < -1.5) return "declining";
  return "stable";
}

function getDimensionTrends(
  input: MomentumInput,
  current: { affection: number; trust: number; intimacy: number },
): { affectionTrend: DimensionTrend; trustTrend: DimensionTrend; intimacyTrend: DimensionTrend } {
  if (!input.previousValues) {
    return { affectionTrend: "stable", trustTrend: "stable", intimacyTrend: "stable" };
  }

  const classify = (curr: number, prev: number): DimensionTrend => {
    const delta = curr - prev;
    if (delta > 1.5) return "rising";
    if (delta < -1.5) return "declining";
    return "stable";
  };

  return {
    affectionTrend: classify(current.affection, input.previousValues.affection),
    trustTrend: classify(current.trust, input.previousValues.trust),
    intimacyTrend: classify(current.intimacy, input.previousValues.intimacy),
  };
}

// ===========================================================================
// Chat Frequency
// ===========================================================================

export function computeChatFrequency(
  recentInteractions: Array<{ timestamp: number }>,
  windowDays: number = 7,
): number {
  if (recentInteractions.length === 0) return 0;
  const now = Date.now();
  const windowMs = windowDays * 24 * 3600 * 1000;
  const inWindow = recentInteractions.filter(
    (i) => now - i.timestamp < windowMs,
  );
  return Math.round((inWindow.length / windowDays) * 100) / 100;
}

// ===========================================================================
// Helpers
// ===========================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function trendLabel(trend: RelationshipTrend): string {
  switch (trend) {
    case "rising": return "升温中 ↑";
    case "declining": return "渐行渐远 ↓";
    case "stable": return "平稳 →";
  }
}

function buildContextSummary(
  trend: RelationshipTrend,
  decayApplied: boolean,
  daysAway: number,
  isVip: boolean,
): string {
  const base = `关系趋势：${trendLabel(trend)}。`;

  if (decayApplied && daysAway > 3) {
    const warmNote = isVip
      ? "但因为你选择了留下，距离并没有削弱太多。"
      : "时间让一些感觉变淡了，但羁绊还在。";
    return base + warmNote;
  }

  if (decayApplied && daysAway > 1) {
    return base + "短暂的离开让思念悄悄生长。";
  }

  if (trend === "rising") {
    return base + "每一次对话都在拉近距离。";
  }

  return base;
}

// ===========================================================================
// Lightweight: apply momentum to an existing EvolutionState
// (non-mutating — returns suggested deltas)
// ===========================================================================

export interface MomentumDelta {
  affectionDelta: number;
  trustDelta: number;
  intimacyDelta: number;
}

export function computeMomentumDelta(result: MomentumResult, input: MomentumInput): MomentumDelta {
  return {
    affectionDelta: result.newAffection - input.currentAffection,
    trustDelta: result.newTrust - input.currentTrust,
    intimacyDelta: result.newIntimacy - input.currentIntimacy,
  };
}

