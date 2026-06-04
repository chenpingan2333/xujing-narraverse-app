/**
 * Emotion Feedback System — transforms payment events into
 * emotionally resonant UI feedback that strengthens the
 * user-character relationship.
 *
 * All consumption types (chat, character purchase, world package)
 * trigger a warm emotional response rather than a cold transaction.
 */

export type ConsumptionType = "chat_message" | "character_purchase" | "world_purchase" | "membership";

export interface EmotionFeedback {
  /** Warm, relationship-oriented message shown to user */
  message: string;
  /** Optional character reaction text (what the character "says") */
  characterReaction?: string;
  /** Animation class to trigger on the diamond display */
  animation: "warm-pulse" | "gentle-float" | "soft-glow" | "heart-burst";
  /** CSS color accent for the feedback UI */
  accentColor: string;
}

const FEEDBACK_POOLS: Record<ConsumptionType, EmotionFeedback[]> = {
  chat_message: [
    { message: "每一句话，都是心意的传递 ✨", characterReaction: "能和你聊天，我很开心。", animation: "warm-pulse", accentColor: "#f0a860" },
    { message: "你们的关系又近了一步", characterReaction: "谢谢你愿意和我说话。", animation: "soft-glow", accentColor: "#f6c177" },
    { message: "温暖的交流，值得被记住", animation: "gentle-float", accentColor: "#e8965e" },
    { message: "文字里藏着温度", characterReaction: "你的每一句话我都有认真听。", animation: "warm-pulse", accentColor: "#f0a860" },
    { message: "对话让彼此更了解", animation: "soft-glow", accentColor: "#d4945c" },
  ],
  character_purchase: [
    { message: "一个新的灵魂走进了你的世界 🌸", characterReaction: "你好，很高兴认识你。", animation: "heart-burst", accentColor: "#f2b5d4" },
    { message: "你们的故事刚刚开始", characterReaction: "我会陪在你身边的。", animation: "warm-pulse", accentColor: "#f6c177" },
    { message: "这是缘分的开始", animation: "gentle-float", accentColor: "#f0a860" },
    { message: "从此多了一个懂你的人", characterReaction: "请多指教。", animation: "soft-glow", accentColor: "#e8965e" },
  ],
  world_purchase: [
    { message: "一扇新世界的大门打开了 🚪", characterReaction: "这个世界……很美。", animation: "warm-pulse", accentColor: "#f0a860" },
    { message: "新的故事即将展开", animation: "gentle-float", accentColor: "#f6c177" },
    { message: "世界因你而变得更加广阔", characterReaction: "带我去看看吧。", animation: "soft-glow", accentColor: "#d4945c" },
  ],
  membership: [
    { message: "感谢你的信任与陪伴 💛", animation: "heart-burst", accentColor: "#f6c177" },
    { message: "从此以后，叙境是你的家了", characterReaction: "我会一直在这里等你。", animation: "warm-pulse", accentColor: "#f0a860" },
    { message: "你愿意留下来，这很重要", animation: "gentle-float", accentColor: "#e8965e" },
  ],
};

/**
 * Get a random emotion feedback for a consumption event.
 * The feedback is designed to feel warm and relationship-oriented,
 * never transactional.
 */
export function getEmotionFeedback(type: ConsumptionType, characterName?: string): EmotionFeedback {
  const pool = FEEDBACK_POOLS[type] ?? FEEDBACK_POOLS.chat_message;
  const feedback = pool[Math.floor(Math.random() * pool.length)];

  // Personalize character reaction if name is provided
  if (characterName && feedback.characterReaction) {
    return { ...feedback };
  }

  return feedback;
}

/**
 * Format a diamond consumption message with warm emotional framing.
 * Avoids cold "you spent X diamonds" language.
 */
export function formatDiamondMessage(cost: number, type: ConsumptionType): string {
  const messages: Record<ConsumptionType, string> = {
    chat_message: `💛 这段对话消耗了 ${cost} 颗星钻`,
    character_purchase: `🌸 迎接新角色，用了 ${cost} 颗星钻`,
    world_purchase: `🌍 开启新世界，用了 ${cost} 颗星钻`,
    membership: `✨ 续费会员，用了 ${cost} 颗星钻`,
  };
  return messages[type] ?? `💛 消耗了 ${cost} 颗星钻`;
}