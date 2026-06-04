import type { MemoryExtractionResult } from "./types.js";
import type { EpisodicMemory, PreferenceMemory, PromiseMemory, RelationshipMemory } from "./types.js";

interface ChatMessage {
  userId: string;
  characterId: string;
  role: "user" | "character";
  content: string;
  timestamp: number;
}

// ─── Keyword / pattern matchers ──────────────────────────────────────────────

const PROMISE_PATTERNS = [
  /我(?:答应|保证|发誓|承诺|一定会|绝对会|肯定要)/,
  /(?:答应|保证|发誓|承诺)你/,
  /(?:下次|以后|明天|将来|回头).*(?:给你|帮你|带你|陪你|告诉)/,
  /我会(?:记住|做到的|完成)/,
  /说好了/,
  /一言为定/,
];

const PREFERENCE_PATTERNS = [
  /(?:喜欢|讨厌|害怕|享受|厌恶|热爱|沉迷|痴迷)/,
  /(?:最[爱恨怕喜讨厌]).*是/,
  /(?:特别|一直|从小就|从来就).*(?:喜欢|爱|讨厌)/,
  /我的.*(?:爱好|兴趣|习惯)/,
];

const EMOTIONAL_PATTERNS = [
  /(?:开心|难过|愤怒|害怕|惊讶|厌恶|紧张|兴奋|失落|感动|后悔|愧疚|自豪|欣慰)/,
  /(?:哭了|笑了|颤抖|哽咽|脸红|心酸|心动)/,
  /(?:情绪|心情|感觉|感受).*(?:好|差|糟糕|奇妙|复杂)/,
];

// ─── Scoring ─────────────────────────────────────────────────────────────────

function estimateImportance(
  content: string,
  matchesEmotion: boolean,
  matchesPromise: boolean,
): number {
  let score = 0.3;
  if (content.length > 80) score += 0.15;
  if (matchesEmotion) score += 0.25;
  if (matchesPromise) score += 0.3;
  return Math.min(1, score);
}

// ─── Extraction ──────────────────────────────────────────────────────────────

export function extractMemory(
  messages: ChatMessage[],
  userId: string,
  characterId: string,
): MemoryExtractionResult {
  const episodic: Omit<EpisodicMemory, "id" | "createdAt">[] = [];
  const relationship: Omit<RelationshipMemory, "id" | "createdAt">[] = [];
  const promises: Omit<PromiseMemory, "id" | "createdAt" | "resolvedAt">[] = [];
  const preferences: Omit<PreferenceMemory, "id" | "createdAt">[] = [];

  let positiveCount = 0;
  let negativeCount = 0;

  for (const msg of messages) {
    const isUser = msg.role === "user";
    const content = msg.content;

    const matchedPromise = PROMISE_PATTERNS.some((p) => p.test(content));
    if (matchedPromise) {
      promises.push({
        userId,
        characterId,
        direction: isUser ? "user_to_character" : "character_to_user",
        content: content.slice(0, 200),
        status: "active",
        importance: estimateImportance(content, false, true),
      });
    }

    const matchedPreference = PREFERENCE_PATTERNS.some((p) => p.test(content));
    if (matchedPreference) {
      preferences.push({
        userId,
        characterId,
        category: inferPreferenceCategory(content),
        content: content.slice(0, 200),
        importance: estimateImportance(content, false, false) + 0.15,
      });
    }

    const matchedEmotion = EMOTIONAL_PATTERNS.some((p) => p.test(content));
    if (matchedEmotion) {
      episodic.push({
        userId,
        characterId,
        eventType: "emotional_shift",
        content: content.slice(0, 300),
        importance: estimateImportance(content, true, false),
      });
    }

    const sentiment = quickSentiment(content);
    if (sentiment > 0) positiveCount++;
    if (sentiment < 0) negativeCount++;

    const isAlreadyCaptured = matchedEmotion || matchedPromise;
    if (!isAlreadyCaptured && content.length > 20) {
      episodic.push({
        userId,
        characterId,
        eventType: "conversation",
        content: content.slice(0, 300),
        importance: estimateImportance(content, false, false),
      });
    }
  }

  const total = positiveCount + negativeCount;
  if (total > 0) {
    const affectionDelta = (positiveCount - negativeCount) * 2;
    const trustDelta = positiveCount > negativeCount ? 1 : -1;
    const intimacyDelta = Math.round((positiveCount - negativeCount) * 0.5);

    if (affectionDelta !== 0 || intimacyDelta !== 0) {
      relationship.push({
        userId,
        characterId,
        deltaAffection: affectionDelta,
        deltaTrust: trustDelta,
        deltaIntimacy: intimacyDelta,
        reason: `Conversation with ${positiveCount.toString()} positive and ${negativeCount.toString()} negative exchanges`,
        importance: Math.min(1, total / 20),
      });
    }
  }

  return { episodic, relationship, promises, preferences };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inferPreferenceCategory(content: string): string {
  const lowered = content;
  if (/吃|喝|食物|菜|甜|辣|咸|酸|苦/.test(lowered)) return "food";
  if (/音乐|歌|曲|听|唱/.test(lowered)) return "music";
  if (/书|读|看.*书|小说|文学/.test(lowered)) return "books";
  if (/电影|剧|看.*片|影院/.test(lowered)) return "movies";
  if (/运动|跑步|健身|打球|游泳/.test(lowered)) return "sports";
  if (/旅行|旅游|去.*地方|风景/.test(lowered)) return "travel";
  if (/工作|上班|职业|行业/.test(lowered)) return "work";
  if (/人|朋友|家人|父母|兄弟|姐妹/.test(lowered)) return "relationships";
  return "general";
}

const POSITIVE_WORDS = new Set([
  "开心", "高兴", "喜欢", "爱", "好", "棒", "赞", "谢谢", "感谢",
  "美妙", "幸福", "快乐", "温暖", "感动", "美好", "期待", "希望",
  "漂亮", "精彩", "完美", "优秀", "厉害", "佩服", "欣赏",
]);

const NEGATIVE_WORDS = new Set([
  "难过", "伤心", "讨厌", "恨", "差", "烂", "糟", "烦", "气",
  "痛苦", "悲伤", "绝望", "失望", "后悔", "愧疚", "害怕", "恐惧",
  "愤怒", "生气", "恶心", "无聊", "尴尬", "无奈",
]);

function quickSentiment(text: string): number {
  let score = 0;
  for (const word of POSITIVE_WORDS) {
    if (text.includes(word)) score++;
  }
  for (const word of NEGATIVE_WORDS) {
    if (text.includes(word)) score--;
  }
  return score;
}
