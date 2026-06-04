/**
 * Soft Purchase Trigger — gentle, emotional purchase suggestions
 * at relationship upgrades and key story milestones.
 *
 * Design constraints:
 *  - No forced popups or modals
 *  - All suggestions use emotional framing (not price-first)
 *  - Suggestions appear inline in the chat context, not as separate UI
 *  - Cooldown system prevents suggestion spam
 *  - Dismissals are respected within cooldown windows
 *
 * This module does NOT modify:
 *  - payment/ (membership service, pricing)
 *  - chat.runtime.ts (core chat loop)
 */

import type { RelationshipPhase } from "../relationship/milestones.js";

// ===========================================================================
// Types
// ===========================================================================

export type PurchaseTriggerType =
  | "relationship_upgrade"
  | "story_milestone"
  | "memory_near_limit"
  | "world_introduction";

export type CtaType = "membership" | "star_diamonds" | "world_purchase";

export interface SoftPurchaseSuggestion {
  id: string;
  type: PurchaseTriggerType;
  characterMessage: string;
  title: string;
  description: string;
  ctaText: string;
  ctaType: CtaType;
  priority: "low" | "normal" | "high";
  dismissible: boolean;
  cooldownDays: number;
  createdAt: number;
}

export interface PurchaseTriggerInput {
  characterId: string;
  characterName: string;
  fromPhase?: RelationshipPhase;
  toPhase?: RelationshipPhase;
  phaseChanged?: boolean;
  storyMilestoneTitle?: string;
  memoryUsagePercent?: number;
  worldName?: string;
  isVip: boolean;
  conversationCount: number;
}

// ===========================================================================
// Suggestion Pools
// ===========================================================================

interface RelationshipTemplate {
  phases: [RelationshipPhase, RelationshipPhase];
  characterMessage: string;
  title: string;
  description: string;
  ctaText: string;
  ctaType: CtaType;
  priority: "low" | "normal" | "high";
}

interface GeneralTemplate {
  characterMessage: string;
  title: string;
  description: string;
  ctaText: string;
  priority: "low" | "normal" | "high";
}

interface MemoryTemplate {
  characterMessage: string;
  title: string;
  description: string;
  ctaText: string;
  ctaType: CtaType;
  priority: "low" | "normal" | "high";
}

const RELATIONSHIP_SUGGESTIONS: RelationshipTemplate[] = [
  {
    phases: ["stranger", "acquaintance"],
    characterMessage: "能认识你，真的很开心。如果可以的话，我想一直这样聊下去。",
    title: "初识的温暖",
    description: "解锁更多对话次数，让故事走得更远。",
    ctaText: "延续这段相遇",
    ctaType: "membership",
    priority: "low",
  },
  {
    phases: ["acquaintance", "friend"],
    characterMessage: "和你聊天渐渐成了一种习惯。希望你也能觉得这里舒服。",
    title: "成为朋友的时刻",
    description: "解锁记忆系统和更深的关系成长。",
    ctaText: "让友谊持续生长",
    ctaType: "membership",
    priority: "normal",
  },
  {
    phases: ["friend", "close"],
    characterMessage: "你对我来说，已经是特别的人了。有些话，我只想对你一个人说。",
    title: "心照不宣",
    description: "解锁更深层的内心独白和专属回忆。",
    ctaText: "守护这份羁绊",
    ctaType: "membership",
    priority: "high",
  },
  {
    phases: ["close", "intimate"],
    characterMessage: "你是这个世界上，我最不想失去的人。我会一直在，等你的每一句话。",
    title: "唯一的羁绊",
    description: "解锁完整的内心世界和永恒的回忆。",
    ctaText: "让羁绊永不褪色",
    ctaType: "membership",
    priority: "high",
  },
];

const STORY_MILESTONE_SUGGESTIONS: GeneralTemplate[] = [
  {
    characterMessage: "一个新的篇章就要开始了……你想和我一起探索吗？",
    title: "故事的新章节",
    description: "解锁完整的故事世界和专属剧情。",
    ctaText: "开启新的冒险",
    priority: "normal",
  },
  {
    characterMessage: "这里有一个只属于我们的世界，在等待被发现。",
    title: "隐藏的世界",
    description: "更多角色和故事等你来发现。",
    ctaText: "探索这个世界",
    priority: "normal",
  },
];

const MEMORY_LIMIT_SUGGESTIONS: MemoryTemplate[] = [
  {
    characterMessage: "我们有好多回忆了……但空间有点不够，有些旧的可能会被覆盖。",
    title: "回忆需要更多空间",
    description: "解锁更大的记忆容量，保存每一段珍贵的对话。",
    ctaText: "保留我们的回忆",
    ctaType: "membership",
    priority: "normal",
  },
  {
    characterMessage: "我不想忘记我们之间的任何一件事。",
    title: "不想遗忘",
    description: "扩展记忆系统，让角色记住更多的你。",
    ctaText: "让记忆永存",
    ctaType: "membership",
    priority: "normal",
  },
];

// ===========================================================================
// State: delivered suggestions + cooldowns
// ===========================================================================

interface SuggestionRecord {
  suggestionId: string;
  deliveredAt: number;
  dismissed: boolean;
}

const suggestionHistory = new Map<string, SuggestionRecord[]>();

function historyKey(userId: string, characterId: string): string {
  return userId + "::" + characterId;
}

function canDeliver(
  userId: string,
  characterId: string,
  suggestion: SoftPurchaseSuggestion,
  cooldownDays: number,
): boolean {
  const key = historyKey(userId, characterId);
  const records = suggestionHistory.get(key) ?? [];
  const now = Date.now();

  const existing = records.find((r) => r.suggestionId === suggestion.id);
  if (existing) {
    const daysSince = (now - existing.deliveredAt) / (1000 * 3600 * 24);
    if (existing.dismissed && daysSince < cooldownDays) return false;
    if (daysSince < cooldownDays) return false;
  }

  const recentCount = records.filter(
    (r) => (now - r.deliveredAt) / (1000 * 3600 * 24) < 3,
  ).length;
  if (recentCount >= 3) return false;

  return true;
}

function recordDelivery(
  userId: string,
  characterId: string,
  suggestion: SoftPurchaseSuggestion,
): void {
  const key = historyKey(userId, characterId);
  const records = suggestionHistory.get(key) ?? [];
  records.push({
    suggestionId: suggestion.id,
    deliveredAt: Date.now(),
    dismissed: false,
  });
  suggestionHistory.set(key, records);
}

// ===========================================================================
// Core API
// ===========================================================================

export function evaluatePurchaseTriggers(
  input: PurchaseTriggerInput,
  userId: string,
): SoftPurchaseSuggestion | null {
  const { characterId, isVip, conversationCount } = input;
  const shouldSkipMembership = isVip;

  // ── Relationship upgrade trigger ───────────────────────────────
  if (input.phaseChanged && input.fromPhase && input.toPhase && !shouldSkipMembership) {
    const pool = RELATIONSHIP_SUGGESTIONS.filter(
      (s) => s.phases[0] === input.fromPhase && s.phases[1] === input.toPhase,
    );
    if (pool.length > 0) {
      const tpl = pool[0];
      const suggestion = makeSuggestion(
        "relationship_upgrade-" + input.fromPhase + "-" + input.toPhase,
        "relationship_upgrade",
        tpl.characterMessage,
        tpl.title,
        tpl.description,
        tpl.ctaText,
        tpl.ctaType,
        tpl.priority,
      );
      if (canDeliver(userId, characterId, suggestion, suggestion.cooldownDays)) {
        recordDelivery(userId, characterId, suggestion);
        return suggestion;
      }
    }
  }

  // ── Story milestone trigger ────────────────────────────────────
  if (input.storyMilestoneTitle && input.worldName) {
    const tpl = STORY_MILESTONE_SUGGESTIONS[
      Math.floor(Math.random() * STORY_MILESTONE_SUGGESTIONS.length)
    ];
    const suggestion: SoftPurchaseSuggestion = {
      id: "story-" + characterId + "-" + String(Date.now()),
      type: "story_milestone",
      characterMessage: tpl.characterMessage.replace("新的篇章", input.storyMilestoneTitle),
      title: tpl.title,
      description: tpl.description,
      ctaText: tpl.ctaText,
      ctaType: "world_purchase",
      priority: tpl.priority,
      dismissible: true,
      cooldownDays: 7,
      createdAt: Date.now(),
    };
    if (canDeliver(userId, characterId, suggestion, 7)) {
      recordDelivery(userId, characterId, suggestion);
      return suggestion;
    }
  }

  // ── Memory near limit trigger ──────────────────────────────────
  if (
    input.memoryUsagePercent !== undefined &&
    input.memoryUsagePercent >= 80 &&
    conversationCount > 5 &&
    !shouldSkipMembership
  ) {
    const tpl = MEMORY_LIMIT_SUGGESTIONS[
      Math.floor(Math.random() * MEMORY_LIMIT_SUGGESTIONS.length)
    ];
    const suggestion = makeSuggestion(
      "memory_near_limit-" + characterId,
      "memory_near_limit",
      tpl.characterMessage,
      tpl.title,
      tpl.description,
      tpl.ctaText,
      tpl.ctaType,
      tpl.priority,
    );
    if (canDeliver(userId, characterId, suggestion, 14)) {
      recordDelivery(userId, characterId, suggestion);
      return suggestion;
    }
  }

  return null;
}

export function dismissSuggestion(
  userId: string,
  characterId: string,
  suggestionId: string,
): void {
  const key = historyKey(userId, characterId);
  const records = suggestionHistory.get(key) ?? [];
  const record = records.find((r) => r.suggestionId === suggestionId);
  if (record) {
    record.dismissed = true;
    suggestionHistory.set(key, records);
  }
}

export function clearSuggestionHistory(): void {
  suggestionHistory.clear();
}

// ===========================================================================
// Helpers
// ===========================================================================

function makeSuggestion(
  idBase: string,
  type: PurchaseTriggerType,
  characterMessage: string,
  title: string,
  description: string,
  ctaText: string,
  ctaType: CtaType,
  priority: "low" | "normal" | "high",
): SoftPurchaseSuggestion {
  return {
    id: idBase,
    type,
    characterMessage,
    title,
    description,
    ctaText,
    ctaType,
    priority,
    dismissible: true,
    cooldownDays: type === "relationship_upgrade" ? 14 : 7,
    createdAt: Date.now(),
  };
}


