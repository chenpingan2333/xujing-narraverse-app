import type { DailyMood, EchoMessage } from './mood-engine.js';
import { createEchoId } from './mood-engine.js';

const LONGING_ECHOES: Record<string, Array<{ text: string; minLonging: number }>> = {
  light: [
    { text: '今天还没有见到你，不过不急。', minLonging: 0.1 },
    { text: '这边一切都好，只是少了点声音。', minLonging: 0.15 },
    { text: '风里有你留下的温度。', minLonging: 0.2 },
  ],
  medium: [
    { text: '昨天你没来，我好像有点不习惯。', minLonging: 0.3 },
    { text: '刚刚想起你之前说过的话。', minLonging: 0.35 },
    { text: '你什么时候回来？我等你。', minLonging: 0.4 },
    { text: '什么都不说也没关系，只是想知道你在。', minLonging: 0.45 },
  ],
  strong: [
    { text: '好几天了，你是不是很忙？别太累了。', minLonging: 0.55 },
    { text: '一个人坐着的时候，老是想起你说话的样子。', minLonging: 0.6 },
    { text: '还记得你第一次来找我的那天吗……', minLonging: 0.65 },
    { text: '不需要每天都来，只是希望你知道，我一直在。', minLonging: 0.7 },
    { text: '我会一直在这里，不管多久。', minLonging: 0.8 },
  ],
};

const MEMORY_ECHOES = [
  '我刚刚想起了一次你说过的话……虽然已经过去很久了，但还记得很清楚。',
  '你之前讲的那件事，我今天又想到了。有点怀念。',
  '那些一起聊天的时光，好像就在昨天一样。',
  '你留下的碎片我都收好了，每一片都是暖的。',
  '有时候，一个词就能让我想起你。',
];

const MILESTONE_ECHOES: Record<string, string> = {
  'stranger-acquaintance': '从初见到相识，这是一段值得记住的开始。',
  'acquaintance-friend': '我们已经是朋友了。谢谢你的信任。',
  'friend-close': '你对我来说，越来越重要了。',
  'close-intimate': '最深的羁绊，无可替代。谢谢你一直在这里。',
};

function pickLongingEcho(longing: number): string | null {
  let pool: Array<{ text: string; minLonging: number }>;
  if (longing < 0.3) {
    pool = LONGING_ECHOES.light;
  } else if (longing < 0.55) {
    pool = LONGING_ECHOES.medium;
  } else {
    pool = LONGING_ECHOES.strong;
  }
  const candidates = pool.filter(e => longing >= e.minLonging);
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)].text;
}

export function generateEchoes(
  mood: DailyMood,
  characterName: string,
): EchoMessage[] {
  const echoes: EchoMessage[] = [];
  const { characterId, longingLevel, passiveDays, date, mood: currentMood } = mood;

  if (passiveDays >= 1 && longingLevel > 0.25) {
    const content = pickLongingEcho(longingLevel);
    if (content) {
      echoes.push({
        id: createEchoId(characterId, date, 'longing'),
        characterId,
        characterName,
        content,
        type: 'longing',
        generatedAt: Date.now(),
        dismissible: true,
        priority: passiveDays > 3 ? 'normal' : 'low',
      });
    }
  }

  if (passiveDays >= 2 && Math.random() < 0.35) {
    const content = MEMORY_ECHOES[Math.floor(Math.random() * MEMORY_ECHOES.length)];
    echoes.push({
      id: createEchoId(characterId, date, 'memory-echo'),
      characterId,
      characterName,
      content,
      type: 'memory-echo',
      generatedAt: Date.now(),
      dismissible: true,
      priority: 'low',
    });
  }

  if (passiveDays === 0 && longingLevel < 0.2 && currentMood === 'happy') {
    const messages = ['今天也谢谢你来看我。', '你来了，今天就是好的。', '见到你真好。'];
    echoes.push({
      id: createEchoId(characterId, date, 'daily-checkin'),
      characterId,
      characterName,
      content: messages[Math.floor(Math.random() * messages.length)],
      type: 'daily-checkin',
      generatedAt: Date.now(),
      dismissible: true,
      priority: 'low',
    });
  }

  return echoes;
}

export function generateMilestoneEcho(
  characterId: string,
  characterName: string,
  fromPhase: string,
  toPhase: string,
): EchoMessage | null {
  const key = fromPhase + '-' + toPhase;
  const content = MILESTONE_ECHOES[key];
  if (!content) return null;

  return {
    id: createEchoId(characterId, new Date().toISOString().slice(0, 10), 'milestone'),
    characterId,
    characterName,
    content,
    type: 'milestone',
    generatedAt: Date.now(),
    dismissible: false,
    priority: 'normal',
  };
}