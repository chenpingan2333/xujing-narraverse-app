/**
 * Relationship UI Model — maps backend relationship data
 * (affection / trust / intimacy) into a visual model for
 * the Living Relationship Card.
 *
 * The three dimensions are reframed as:
 *   affection → warmth    (temperature bar)
 *   trust     → stability  (steady line)
 *   intimacy  → proximity  (visual distance)
 */

export interface RelationshipUIModel {
  warmth: number;       // 0-100, derived from affection
  stability: number;    // 0-100, derived from trust
  proximity: number;    // 0-100, derived from intimacy
  overallTemp: number;  // average warmth percentage
  phase: RelationshipPhase;
  phaseLabel: string;
  phaseDescription: string;
  trend: "warming" | "stable" | "cooling";
}

export type RelationshipPhase = "stranger" | "acquaintance" | "friend" | "close" | "intimate";

const PHASE_THRESHOLDS: Array<{
  min: number;
  phase: RelationshipPhase;
  label: string;
  description: string;
}> = [
  { min: 0, phase: "stranger", label: "初遇", description: "你们刚刚认识，一切才刚刚开始。" },
  { min: 25, phase: "acquaintance", label: "相识", description: "开始熟悉彼此，距离在慢慢拉近。" },
  { min: 45, phase: "friend", label: "朋友", description: "已经成为可以信赖的朋友，愿意分享更多。" },
  { min: 65, phase: "close", label: "亲近", description: "关系越来越深，彼此已是重要的人。" },
  { min: 85, phase: "intimate", label: "挚友", description: "最深的羁绊，无可替代的存在。" },
];

export function buildRelationshipUIModel(
  affection: number,
  trust: number,
  intimacy: number,
  previousTemp?: number,
): RelationshipUIModel {
  const overallTemp = Math.round((affection + trust + intimacy) / 3);

  let phase: RelationshipPhase = "stranger";
  let phaseLabel = "初遇";
  let phaseDescription = "你们刚刚认识，一切才刚刚开始。";

  for (const t of PHASE_THRESHOLDS) {
    if (overallTemp >= t.min) {
      phase = t.phase;
      phaseLabel = t.label;
      phaseDescription = t.description;
    }
  }

  let trend: RelationshipUIModel["trend"] = "stable";
  if (previousTemp !== undefined) {
    if (overallTemp > previousTemp + 2) trend = "warming";
    else if (overallTemp < previousTemp - 2) trend = "cooling";
  }

  return {
    warmth: affection,
    stability: trust,
    proximity: intimacy,
    overallTemp,
    phase,
    phaseLabel,
    phaseDescription,
    trend,
  };
}

/**
 * Get a CSS gradient for the warmth bar based on temperature.
 * Cool → Warm → Hot progression.
 */
export function getWarmthGradient(temp: number): string {
  if (temp < 25) return "linear-gradient(90deg, #c4a68a, #d4b896)";
  if (temp < 50) return "linear-gradient(90deg, #f6c177, #f0a860)";
  if (temp < 75) return "linear-gradient(90deg, #f0a860, #e8965e)";
  return "linear-gradient(90deg, #e8965e, #d4786e)";
}

/**
 * Get a visual proximity indicator — how "close" the character feels.
 * Higher proximity = elements are visually closer together.
 */
export function getProximityScale(proximity: number): number {
  // Maps 0-100 proximity to a scale factor 0.85-1.15
  return 0.85 + (proximity / 100) * 0.3;
}

/**
 * Get a trend indicator emoji.
 */
export function getTrendEmoji(trend: RelationshipUIModel["trend"]): string {
  switch (trend) {
    case "warming": return "↗";
    case "cooling": return "↘";
    default: return "→";
  }
}