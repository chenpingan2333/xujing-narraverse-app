/**
 * Emotional Metrics — lightweight retention analytics that don't
 * interfere with business logic.
 *
 * All metrics are fire-and-forget: they don't block the main flow,
 * don't throw errors, and are designed for future optimization only.
 *
 * 💛 Metrics collected:
 *  - daily_active_character_count: how many characters users chat with daily
 *  - relationship_growth_rate: avg daily affection/trust/intimacy change
 *  - emotion_feedback_trigger_rate: how often emotional moments fire
 *  - return_user_character_reengagement: % returning users who chat with same character
 *  - vip_emotional_impact: boosted relationship growth vs free
 *  - echo_delivery_rate: how many daily echoes are delivered vs dismissed
 */

// ═══════════════════════════════════════════════════════════════════════════
// Metric Types
// ═══════════════════════════════════════════════════════════════════════════

export interface DailyActiveCharacterMetric {
  timestamp: number;
  date: string;
  userId: string;
  activeCharacterIds: string[];
  count: number;
}

export interface RelationshipGrowthMetric {
  timestamp: number;
  date: string;
  userId: string;
  characterId: string;
  affectionDelta: number;
  trustDelta: number;
  intimacyDelta: number;
  overallGrowth: number;
}

export interface EmotionFeedbackMetric {
  timestamp: number;
  userId: string;
  characterId: string;
  type: string;
  triggered: boolean;
}

export interface ReturnUserReengagementMetric {
  timestamp: number;
  userId: string;
  daysSinceLastVisit: number;
  reengagedCharacterId: string | null;
  reengaged: boolean;
}

export interface VIPEmotionalImpactMetric {
  timestamp: number;
  userId: string;
  characterId: string;
  isVip: boolean;
  totalAffectionGrowth: number;
  totalTrustGrowth: number;
  totalIntimacyGrowth: number;
}

export interface EchoDeliveryMetric {
  timestamp: number;
  userId: string;
  characterId: string;
  echoId: string;
  echoType: string;
  delivered: boolean;
  dismissedWithinMs: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// In-memory metric buffer (fire-and-forget, non-blocking)
// ═══════════════════════════════════════════════════════════════════════════

const metricsBuffer: {
  dailyActive: DailyActiveCharacterMetric[];
  relationshipGrowth: RelationshipGrowthMetric[];
  emotionFeedback: EmotionFeedbackMetric[];
  returnReengagement: ReturnUserReengagementMetric[];
  vipImpact: VIPEmotionalImpactMetric[];
  echoDelivery: EchoDeliveryMetric[];
} = {
  dailyActive: [],
  relationshipGrowth: [],
  emotionFeedback: [],
  returnReengagement: [],
  vipImpact: [],
  echoDelivery: [],
};

const MAX_BUFFER_SIZE = 1000;

// ═══════════════════════════════════════════════════════════════════════════
// Trackers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Track which characters a user is active with today.
 */
export function trackDailyActiveCharacter(userId: string, characterId: string): void {
  const today = new Date().toISOString().slice(0, 10);

  // Find existing entry for today
  const existing = metricsBuffer.dailyActive.find(
    (m) => m.userId === userId && m.date === today,
  );

  if (existing) {
    if (!existing.activeCharacterIds.includes(characterId)) {
      existing.activeCharacterIds.push(characterId);
      existing.count = existing.activeCharacterIds.length;
    }
  } else {
    metricsBuffer.dailyActive.push({
      timestamp: Date.now(),
      date: today,
      userId,
      activeCharacterIds: [characterId],
      count: 1,
    });
  }

  trim('dailyActive');
}

/**
 * Track relationship growth per interaction.
 */
export function trackRelationshipGrowth(
  userId: string,
  characterId: string,
  affectionDelta: number,
  trustDelta: number,
  intimacyDelta: number,
): void {
  metricsBuffer.relationshipGrowth.push({
    timestamp: Date.now(),
    date: new Date().toISOString().slice(0, 10),
    userId,
    characterId,
    affectionDelta,
    trustDelta,
    intimacyDelta,
    overallGrowth: affectionDelta + trustDelta + intimacyDelta,
  });
  trim('relationshipGrowth');
}

/**
 * Track whether an emotional feedback moment was triggered.
 */
export function trackEmotionFeedback(
  userId: string,
  characterId: string,
  type: string,
  triggered: boolean,
): void {
  metricsBuffer.emotionFeedback.push({
    timestamp: Date.now(),
    userId,
    characterId,
    type,
    triggered,
  });
  trim('emotionFeedback');
}

/**
 * Track returning users and their character re-engagement.
 */
export function trackReturnReengagement(
  userId: string,
  daysSinceLastVisit: number,
  reengagedCharacterId: string | null,
): void {
  metricsBuffer.returnReengagement.push({
    timestamp: Date.now(),
    userId,
    daysSinceLastVisit,
    reengagedCharacterId,
    reengaged: reengagedCharacterId !== null,
  });
  trim('returnReengagement');
}

/**
 * Track VIP emotional impact.
 */
export function trackVIPImpact(
  userId: string,
  characterId: string,
  isVip: boolean,
  affectionGrowth: number,
  trustGrowth: number,
  intimacyGrowth: number,
): void {
  metricsBuffer.vipImpact.push({
    timestamp: Date.now(),
    userId,
    characterId,
    isVip,
    totalAffectionGrowth: affectionGrowth,
    totalTrustGrowth: trustGrowth,
    totalIntimacyGrowth: intimacyGrowth,
  });
  trim('vipImpact');
}

/**
 * Track echo delivery.
 */
export function trackEchoDelivery(
  userId: string,
  characterId: string,
  echoId: string,
  echoType: string,
  delivered: boolean,
  dismissedWithinMs: number | null,
): void {
  metricsBuffer.echoDelivery.push({
    timestamp: Date.now(),
    userId,
    characterId,
    echoId,
    echoType,
    delivered,
    dismissedWithinMs,
  });
  trim('echoDelivery');
}

// ═══════════════════════════════════════════════════════════════════════════
// Query helpers (for future dashboard)
// ═══════════════════════════════════════════════════════════════════════════

export function getDailyActiveCharacterCount(date?: string): number {
  const target = date ?? new Date().toISOString().slice(0, 10);
  return metricsBuffer.dailyActive
    .filter((m) => m.date === target)
    .reduce((sum, m) => sum + m.count, 0);
}

export function getAverageRelationshipGrowth(date?: string): number {
  const target = date ?? new Date().toISOString().slice(0, 10);
  const entries = metricsBuffer.relationshipGrowth.filter((m) => m.date === target);
  if (entries.length === 0) return 0;
  return entries.reduce((sum, e) => sum + e.overallGrowth, 0) / entries.length;
}

export function getEmotionFeedbackRate(): number {
  const total = metricsBuffer.emotionFeedback.length;
  if (total === 0) return 0;
  const triggered = metricsBuffer.emotionFeedback.filter((m) => m.triggered).length;
  return triggered / total;
}

export function getReengagementRate(): number {
  const total = metricsBuffer.returnReengagement.length;
  if (total === 0) return 0;
  const reengaged = metricsBuffer.returnReengagement.filter((m) => m.reengaged).length;
  return reengaged / total;
}

export function getVIPGrowthRatio(): number {
  const vipEntries = metricsBuffer.vipImpact.filter((m) => m.isVip);
  const freeEntries = metricsBuffer.vipImpact.filter((m) => !m.isVip);

  if (vipEntries.length === 0 || freeEntries.length === 0) return 0;

  const vipAvg = vipEntries.reduce((s, e) =>
    s + e.totalAffectionGrowth + e.totalTrustGrowth + e.totalIntimacyGrowth, 0
  ) / vipEntries.length;

  const freeAvg = freeEntries.reduce((s, e) =>
    s + e.totalAffectionGrowth + e.totalTrustGrowth + e.totalIntimacyGrowth, 0
  ) / freeEntries.length;

  return freeAvg > 0 ? vipAvg / freeAvg : 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════════════════════════════════

function trim(key: keyof typeof metricsBuffer): void {
  const arr = metricsBuffer[key];
  if (arr.length > MAX_BUFFER_SIZE) {
    (metricsBuffer[key] as unknown[]) = arr.slice(-MAX_BUFFER_SIZE);
  }
}

/** Clear all metrics (for testing) */
export function clearAllMetrics(): void {
  for (const key of Object.keys(metricsBuffer) as Array<keyof typeof metricsBuffer>) {
    metricsBuffer[key] = [];
  }
}
