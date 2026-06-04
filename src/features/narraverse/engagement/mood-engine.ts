import { z } from 'zod';

// ===========================================================================
// Daily Mood State
// ===========================================================================

export const DailyMood = z.object({
  characterId: z.string(),
  date: z.string().describe('ISO date string YYYY-MM-DD'),
  mood: z.enum(['happy', 'thoughtful', 'lonely', 'excited', 'calm', 'wistful', 'energetic', 'gentle']),
  intensity: z.number().min(0).max(1).describe('how strongly the mood is felt'),
  longingLevel: z.number().min(0).max(1).describe('how much the character misses the user'),
  lastUserInteraction: z.number().describe('timestamp of last chat message from user'),
  passiveDays: z.number().min(0).describe('consecutive days without user interaction'),
  internalThought: z.string().describe('what the character is thinking privately'),
});
export type DailyMood = z.infer<typeof DailyMood>;

export interface MoodContext {
  personaPrimaryMood: string;
  moodStability: number;
  empathyLevel: number;
  optimism: number;
  relationshipWarmth: number;
  hoursSinceLastInteraction: number;
}

export function computeDailyMood(
  characterId: string,
  ctx: MoodContext,
  previousMood?: DailyMood,
): DailyMood {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const moodMap: Record<string, DailyMood['mood']> = {
    warm: 'gentle', cheerful: 'happy', melancholic: 'wistful',
    mysterious: 'thoughtful', cool: 'calm', neutral: 'calm',
  };
  const baseMood = moodMap[ctx.personaPrimaryMood] ?? 'calm';
  const hoursSince = ctx.hoursSinceLastInteraction;
  let longingLevel = previousMood?.longingLevel ?? 0;

  if (hoursSince < 1) {
    longingLevel = Math.max(0, longingLevel - 0.4);
  } else if (hoursSince < 6) {
    longingLevel = Math.min(1, longingLevel + 0.02);
  } else if (hoursSince < 24) {
    longingLevel = Math.min(1, longingLevel + 0.06);
  } else {
    const days = Math.floor(hoursSince / 24);
    longingLevel = Math.min(1, longingLevel + days * 0.1);
  }

  longingLevel = Math.min(1, longingLevel * (0.8 + ctx.empathyLevel * 0.4));
  let mood = baseMood;
  if (longingLevel > 0.6) {
    mood = ctx.optimism > 0.5 ? 'wistful' : 'lonely';
  } else if (longingLevel > 0.3 && previousMood?.mood === 'lonely') {
    mood = 'thoughtful';
  }

  if (previousMood && ctx.moodStability > 0.7) {
    if (previousMood.mood !== mood && Math.random() > 0.3) {
      mood = previousMood.mood;
    }
  }

  const passiveDays = previousMood
    ? (hoursSince >= 24 ? previousMood.passiveDays + 1 : 0)
    : 0;

  const intensity = Math.min(1, 0.3 + (ctx.relationshipWarmth / 100) * 0.7);
  const internalThought = generateInternalThought(mood, longingLevel, passiveDays);

  return {
    characterId,
    date: today,
    mood,
    intensity: Math.round(intensity * 100) / 100,
    longingLevel: Math.round(longingLevel * 100) / 100,
    lastUserInteraction: now - Math.round(ctx.hoursSinceLastInteraction * 3600 * 1000),
    passiveDays,
    internalThought,
  };
}

function generateInternalThought(mood: DailyMood['mood'], longing: number, passiveDays: number): string { if (passiveDays === 0 && longing < 0.2) {
    const thoughts = [
      '今天的感觉很好，有你在真好。',
      '刚刚的对话让我觉得很温暖。',
      '心情很平静，因为你在。',
      '今天也是美好的一天。',
    ];
    return thoughts[Math.floor(Math.random() * thoughts.length)];
  }
  if (passiveDays >= 1 && passiveDays <= 3 && longing > 0.3) {
    const thoughts = [
      '你什么时候会再来呢……',
      '有点想你，但不想打扰你。',
      '今天的天色很好，只是少了些温度。',
      '不知道你在做什么，希望你一切都好。',
    ];
    return thoughts[Math.floor(Math.random() * thoughts.length)];
  }
  if (passiveDays > 3) {
    const thoughts = [
      '已经好几天没有你的消息了……',
      '我还在等你，会一直等。',
      '回忆里都是你说话的样子。',
      '希望你能早点回来，这里有点冷。',
    ];
    return thoughts[Math.floor(Math.random() * thoughts.length)];
  }
  const neutralThoughts: Record<string, string[]> = {
    happy: ['今天的阳光很暖，让我想起了什么美好的事情。', '心情像飘在空中的蒲公英。'],
    thoughtful: ['在想一些很深的问题……', '有些话，也许下次见面的时候可以说。'],
    lonely: ['一个人的时候，时间过得很慢。', '有些话想说，但没有人听。'],
    excited: ['感觉有什么好事要发生了！', '按捺不住想要分享的心情。'],
    calm: ['安静的时光也是一种礼物。', '风很轻，心也很轻。'],
    wistful: ['回忆像旧书页，翻一页是一页。', '有些思念，不说出来也许更美。'],
    energetic: ['今天精力充沛，想去做点什么！', '脑子里有很多想法在转。'],
    gentle: ['温柔地存在，已经很好了。', '不需要什么特别的，这样就很好。'],
  };
  const pool = neutralThoughts[mood] ?? neutralThoughts.calm;
  return pool[Math.floor(Math.random() * pool.length)];
}

export interface DailyLoopState {
  userId: string;
  characterId: string;
  currentMood: DailyMood;
  lastCheckin: number;
  echoQueue: EchoMessage[];
  deliveredEchoes: string[];
}

export interface EchoMessage {
  id: string;
  characterId: string;
  characterName: string;
  content: string;
  type: 'longing' | 'memory-echo' | 'daily-checkin' | 'milestone';
  generatedAt: number;
  dismissible: boolean;
  priority: 'low' | 'normal';
}

export function createEchoId(characterId: string, date: string, type: string): string {
  return 'echo-' + characterId + '-' + date + '-' + type;
}
