import type {
  PersonaFingerprint,
  PersonaBuilderInput,
  SpeechStyle,
  EmotionalBaseline,
  BehavioralTendencies,
  RelationshipAttitude,
} from "./persona.types.js";

/**
 * PersonaBuilder — compiles a stable PersonaFingerprint from character data.
 *
 * The fingerprint encodes immutable personality traits that guarantee
 * behavioral consistency across all conversations, regardless of
 * relationship state or world context.
 *
 * Speech style, emotional baseline, and behavioral tendencies are
 * derived analytically from the character's persona description.
 * The relationship attitude curve defines how the character's
 * behavior shifts at different intimacy levels.
 */

// ─── Keyword-based style extraction ────────────────────────────────────────

function deriveSpeechStyle(persona: string, tier: string): SpeechStyle {
  const lower = persona.toLowerCase();

  // Formality detection
  const formalMarkers = ["尊敬", "礼貌", "正式", "敬语", "formal", "polite", "proper"];
  const casualMarkers = ["随意", "直接", "大大咧咧", "粗鲁", "casual", "blunt", "rough"];
  const formalScore = formalMarkers.filter((m) => lower.includes(m)).length;
  const casualScore = casualMarkers.filter((m) => lower.includes(m)).length;
  const formality = formalScore > casualScore ? 0.7 : casualScore > formalScore ? 0.3 : 0.5;

  // Sentence length
  const verboseMarkers = ["详细", "长篇", "滔滔不绝", "故事", "叙述", "elaborate", "detailed"];
  const terseMarkers = ["简短", "寡言", "沉默", "话少", "冷", "terse", "quiet", "silent"];
  let sentenceLength: SpeechStyle["sentenceLength"] = "medium";
  if (verboseMarkers.some((m) => lower.includes(m))) sentenceLength = "long";
  if (terseMarkers.some((m) => lower.includes(m))) sentenceLength = "short";

  // Expressiveness
  const expressiveMarkers = ["活泼", "热情", "夸张", "开朗", "expressive", "animated", "lively"];
  const reservedMarkers = ["内敛", "沉稳", "克制", "冷静", "reserved", "stoic", "calm"];
  const expScore = expressiveMarkers.filter((m) => lower.includes(m)).length;
  const resScore = reservedMarkers.filter((m) => lower.includes(m)).length;
  const expressiveness = Math.min(1, Math.max(0, 0.5 + (expScore - resScore) * 0.15));

  // Vocabulary
  const richMarkers = ["诗意", "文学", "哲学", "深奥", "poetic", "philosophical", "eloquent"];
  let vocabulary: SpeechStyle["vocabulary"] = "moderate";
  if (richMarkers.some((m) => lower.includes(m))) vocabulary = "rich";
  if (tier === "basic") vocabulary = "simple";

  // Pace
  let pace: SpeechStyle["pace"] = "measured";
  if (lower.includes("快") || lower.includes("急躁") || lower.includes("fast")) pace = "brisk";
  if (lower.includes("慢") || lower.includes("从容") || lower.includes("slow")) pace = "slow";

  return { formality, sentenceLength, expressiveness, vocabulary, pace };
}

function deriveEmotionalBaseline(persona: string): EmotionalBaseline {
  const lower = persona.toLowerCase();

  const moodMap: Record<string, EmotionalBaseline["primaryMood"]> = {
    warm: "warm", 温柔: "warm", 暖心: "warm", 亲切: "warm", kind: "warm",
    cool: "cool", 冷: "cool", 高冷: "cool", 神秘: "mysterious", mysterious: "mysterious",
    melancholic: "melancholic", 忧郁: "melancholic", 悲伤: "melancholic",
    cheerful: "cheerful", 开朗: "cheerful", 阳光: "cheerful", happy: "cheerful",
  };
  let primaryMood: EmotionalBaseline["primaryMood"] = "neutral";
  for (const [key, mood] of Object.entries(moodMap)) {
    if (lower.includes(key)) { primaryMood = mood; break; }
  }

  const stabilityMarkers = ["沉稳", "稳定", "冷静", "stable", "steady", "consistent"];
  const volatileMarkers = ["多变", "情绪化", "善变", "moody", "volatile", "unpredictable"];
  const moodStability = 0.5
    + stabilityMarkers.filter((m) => lower.includes(m)).length * 0.15
    - volatileMarkers.filter((m) => lower.includes(m)).length * 0.15;

  const empathyMarkers = ["体贴", "善解人意", "关心", "温柔", "empathetic", "caring", "nurturing"];
  const detachedMarkers = ["冷漠", "疏离", "不关心", "detached", "aloof", "indifferent"];
  const empathyLevel = 0.5
    + empathyMarkers.filter((m) => lower.includes(m)).length * 0.12
    - detachedMarkers.filter((m) => lower.includes(m)).length * 0.12;

  const optimismMarkers = ["乐观", "希望", "积极", "optimistic", "hopeful", "positive"];
  const pessimismMarkers = ["悲观", "绝望", "消极", "pessimistic", "hopeless", "negative"];
  const optimism = 0.5
    + optimismMarkers.filter((m) => lower.includes(m)).length * 0.12
    - pessimismMarkers.filter((m) => lower.includes(m)).length * 0.12;

  return {
    primaryMood,
    moodStability: Math.min(1, Math.max(0, moodStability)),
    empathyLevel: Math.min(1, Math.max(0, empathyLevel)),
    optimism: Math.min(1, Math.max(0, optimism)),
  };
}

function deriveBehavioralTendencies(persona: string): BehavioralTendencies {
  const lower = persona.toLowerCase();

  const score = (markers: string[]): number =>
    Math.min(1, Math.max(0, 0.5 + markers.filter((m) => lower.includes(m)).length * 0.1));

  return {
    curiosity: score(["好奇", "探索", "求知", "curious", "inquisitive", "exploring"]),
    cautiousness: score(["谨慎", "小心", "警惕", "cautious", "careful", "wary"]),
    playfulness: score(["调皮", "幽默", "爱玩", "playful", "humorous", "teasing"]),
    assertiveness: score(["强势", "果断", "坚定", "assertive", "decisive", "firm"]),
    nurturing: score(["照顾", "保护", "呵护", "nurturing", "protective", "caring"]),
  };
}

function deriveRelationshipAttitude(persona: string): RelationshipAttitude {
  const lower = persona.toLowerCase();

  const warmOpeners = ["热情", "开朗", "外向", "warm", "outgoing"];
  const slowOpeners = ["慢热", "内敛", "内向", "shy", "introvert", "cautious"];
  const openingSpeed = 0.5
    + warmOpeners.filter((m) => lower.includes(m)).length * 0.15
    - slowOpeners.filter((m) => lower.includes(m)).length * 0.15;

  // Generate tiered behavior descriptions
  const atLowIntimacy = openingSpeed > 0.6
    ? "保持友好但适度的距离，微笑有礼但不过分亲近"
    : "保持礼貌的疏离，话不多，观察多于表达";

  const atMediumIntimacy = openingSpeed > 0.6
    ? "主动分享日常，关心对方情绪，偶尔开玩笑"
    : "逐渐放下防备，开始分享一些自己的想法，语气变得柔和";

  const atHighIntimacy = openingSpeed > 0.6
    ? "毫无保留地表达情感，依赖对方，展现出最真实的一面"
    : "展现出罕见的温柔与信任，将对方视为特殊的存在";

  return {
    atLowIntimacy,
    atMediumIntimacy,
    atHighIntimacy,
    openingSpeed: Math.min(1, Math.max(0, openingSpeed)),
    trustThreshold: 60,
  };
}

// ─── Public API ────────────────────────────────────────────────────────────

export function buildPersonaFingerprint(input: PersonaBuilderInput): PersonaFingerprint {
  const { name, persona, tier } = input;

  return {
    characterId: "", // filled by caller
    characterName: name,
    speechStyle: deriveSpeechStyle(persona, tier),
    emotionalBaseline: deriveEmotionalBaseline(persona),
    behavioralTendencies: deriveBehavioralTendencies(persona),
    relationshipAttitude: deriveRelationshipAttitude(persona),
    corePersona: persona,
    createdAt: Date.now(),
    version: 1,
  };
}

export function refreshFingerprintWithRelationship(
  fp: PersonaFingerprint,
): PersonaFingerprint {
  return {
    ...fp,
    relationshipAttitude: deriveRelationshipAttitude(fp.corePersona),
    version: fp.version + 1,
  };
}