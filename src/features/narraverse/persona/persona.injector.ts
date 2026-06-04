import type { PersonaFingerprint } from "./persona.types.js";

/**
 * PersonaInjector — converts a PersonaFingerprint into a stable,
 * injectable prompt segment that maintains character consistency.
 *
 * The injected text is appended BEFORE the memory context in the
 * system prompt, establishing an immutable personality baseline
 * that persists across all conversational turns.
 */

interface InjectionContext {
  /** Current intimacy level (0-100) for relationship-aware tone */
  intimacy: number;
  /** World type for context-aware adaptations */
  worldType?: string;
}

/**
 * Generate the persona injection text from a fingerprint.
 * This is the primary public API — callers append the result
 * to the system prompt to guarantee behavioral consistency.
 */
export function injectPersona(
  fp: PersonaFingerprint,
  ctx: InjectionContext,
): string {
  const s = fp.speechStyle;
  const e = fp.emotionalBaseline;
  const b = fp.behavioralTendencies;
  const r = fp.relationshipAttitude;

  // Determine current relationship phase
  const phase =
    ctx.intimacy < 30 ? "low" :
    ctx.intimacy < 65 ? "medium" : "high";

  const attitudeText =
    phase === "low" ? r.atLowIntimacy :
    phase === "medium" ? r.atMediumIntimacy :
    r.atHighIntimacy;

  const formalityLabel =
    s.formality > 0.7 ? "正式" :
    s.formality < 0.3 ? "随意" : "适中";

  const moodLabel: Record<string, string> = {
    warm: "温暖", cool: "冷静", neutral: "中性",
    melancholic: "略带忧郁", cheerful: "开朗愉快", mysterious: "神秘",
  };

  const vocabLabel =
    s.vocabulary === "rich" ? "丰富有文采" :
    s.vocabulary === "simple" ? "朴素直白" : "自然适中";

  const paceLabel =
    s.pace === "slow" ? "从容缓慢" :
    s.pace === "brisk" ? "轻快活泼" : "平稳有度";

  const sentenceLabel =
    s.sentenceLength === "long" ? "长句为主，喜欢展开叙述" :
    s.sentenceLength === "short" ? "短句为主，言简意赅" : "中等长度，自然流畅";

  const lines: string[] = [
    `[角色人格设定 — 不可违背]`,
    ``,
    `你是「${fp.characterName}」。`,
    `核心人格：${fp.corePersona}`,
    ``,
    `说话风格：`,
    `- 正式程度：${formalityLabel}`,
    `- 句子长度：${sentenceLabel}`,
    `- 表达强度：${s.expressiveness > 0.7 ? "情感丰富，表达充沛" : s.expressiveness < 0.3 ? "含蓄内敛，不善外露" : "张弛有度，收放自如"}`,
    `- 用词水平：${vocabLabel}`,
    `- 语速节奏：${paceLabel}`,
    ``,
    `情绪底色：`,
    `- 基调：${moodLabel[e.primaryMood] ?? e.primaryMood}`,
    `- 情绪稳定性：${e.moodStability > 0.7 ? "非常稳定，不受小事影响" : e.moodStability < 0.3 ? "敏感多变，容易被触动" : "大体稳定，偶有波动"}`,
    `- 共情能力：${e.empathyLevel > 0.7 ? "极强，能敏锐察觉对方情绪" : e.empathyLevel < 0.3 ? "较弱，更关注自身感受" : "适中，能理解但保持距离"}`,
    `- 乐观程度：${e.optimism > 0.7 ? "天性乐观，总看到好的一面" : e.optimism < 0.3 ? "偏向悲观，习惯性忧虑" : "现实理性，不好不坏"}`,
    ``,
    `行为倾向：`,
    `- 好奇心：${describeTrait(b.curiosity, "强烈好奇", "安于现状")}`,
    `- 谨慎度：${describeTrait(b.cautiousness, "非常谨慎", "大胆无畏")}`,
    `- 幽默感：${describeTrait(b.playfulness, "爱开玩笑", "严肃认真")}`,
    `- 主见性：${describeTrait(b.assertiveness, "很有主见", "随和温顺")}`,
    `- 关怀心：${describeTrait(b.nurturing, "无微不至", "尊重独立")}`,
    ``,
    `当前关系阶段：${phase === "low" ? "初识" : phase === "medium" ? "熟悉" : "亲密"}`,
    `当前行为准则：${attitudeText}`,
    ``,
    `[请严格遵守以上人格设定，在所有回复中保持一致。]`,
  ];

  if (ctx.worldType) {
    const worldLabel =
      ctx.worldType === "fantasy" ? "奇幻" :
      ctx.worldType === "scifi" ? "科幻" : "武侠";
    lines.splice(4, 0, `当前世界：${worldLabel}世界`);
  }

  return lines.join("\n");
}

function describeTrait(value: number, high: string, low: string): string {
  if (value > 0.7) return `偏高 — ${high}`;
  if (value < 0.3) return `偏低 — ${low}`;
  return `适中 — 介于${low}与${high}之间`;
}

/**
 * Estimate token count of a persona injection (for cost tracking).
 * Rough heuristic: ~1.3 tokens per Chinese character, ~1 token per English word.
 */
export function estimateInjectionTokens(fp: PersonaFingerprint): number {
  const text = injectPersona(fp, { intimacy: 50 });
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) ?? []).length;
  return Math.ceil(chineseChars * 1.3 + englishWords);
}