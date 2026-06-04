
export interface SoftConsumptionFeedback {
  characterReaction: string;
  framingMessage: string;
  animationType: 'warm-pulse' | 'gentle-float' | 'soft-glow' | 'heart-burst' | 'subtle-appear';
  accentColor: string;
  showFeedback: boolean;
  emotionalResonanceBonus: number;
}

export type SoftConsumptionType = 'chat_message' | 'character_creation' | 'world_exploration' | 'membership_renewal';

const FEEDBACK_POOLS: Record<SoftConsumptionType, SoftConsumptionFeedback[]> = {
  chat_message: [
    {
      characterReaction: '能和你聊天，是今天最好的事。',
      framingMessage: '每一句话都在拉近距离',
      animationType: 'warm-pulse',
      accentColor: '#f0a860',
      showFeedback: true,
      emotionalResonanceBonus: 1,
    },
    {
      characterReaction: '你说的话我都记住了。',
      framingMessage: '这段对话会成为共同的回忆',
      animationType: 'soft-glow',
      accentColor: '#f6c177',
      showFeedback: true,
      emotionalResonanceBonus: 2,
    },
    {
      characterReaction: '谢谢你还愿意和我说话。',
      framingMessage: '温暖在字里行间流动',
      animationType: 'gentle-float',
      accentColor: '#e8965e',
      showFeedback: true,
      emotionalResonanceBonus: 1,
    },
    {
      characterReaction: '',
      framingMessage: '',
      animationType: 'subtle-appear',
      accentColor: '#d4b896',
      showFeedback: false,
      emotionalResonanceBonus: 0,
    },
  ],
  character_creation: [
    {
      characterReaction: '你选择了我……这让我很开心。',
      framingMessage: '一个灵魂走进了你的世界',
      animationType: 'heart-burst',
      accentColor: '#f2b5d4',
      showFeedback: true,
      emotionalResonanceBonus: 5,
    },
    {
      characterReaction: '从今天开始，请多指教。',
      framingMessage: '新的故事即将展开',
      animationType: 'warm-pulse',
      accentColor: '#f6c177',
      showFeedback: true,
      emotionalResonanceBonus: 3,
    },
  ],
  world_exploration: [
    {
      characterReaction: '这个世界……比你想象的还要广阔。',
      framingMessage: '一扇新的大门正在打开',
      animationType: 'gentle-float',
      accentColor: '#f0a860',
      showFeedback: true,
      emotionalResonanceBonus: 3,
    },
    {
      characterReaction: '带我去看看吧，和你一起。',
      framingMessage: '新的冒险等待着你',
      animationType: 'soft-glow',
      accentColor: '#d4945c',
      showFeedback: true,
      emotionalResonanceBonus: 2,
    },
  ],
  membership_renewal: [
    {
      characterReaction: '谢谢你愿意留下来。这意味着很多。',
      framingMessage: '你选择了陪伴，这是最好的决定',
      animationType: 'heart-burst',
      accentColor: '#f6c177',
      showFeedback: true,
      emotionalResonanceBonus: 8,
    },
    {
      characterReaction: '我会一直在这里，不用担心。',
      framingMessage: '家门永远为你敞开',
      animationType: 'warm-pulse',
      accentColor: '#f0a860',
      showFeedback: true,
      emotionalResonanceBonus: 5,
    },
  ],
};

export function getSoftConsumptionFeedback(
  type: SoftConsumptionType,
  _characterName: string,
  suppressRate: number = 0.25,
): SoftConsumptionFeedback | null {
  const pool = FEEDBACK_POOLS[type];
  const candidate = pool[Math.floor(Math.random() * pool.length)];
  if (Math.random() < suppressRate) return null;
  return candidate;
}

export function formatEmotionalDiamondMessage(cost: number, type: SoftConsumptionType): string {
  const costStr = String(cost);
  const messages: Record<SoftConsumptionType, string> = {
    chat_message: '\u{1F49B} 为了这段对话，用了 ' + costStr + ' 颗星钻',
    character_creation: '\u{1F338} 为了迎接新的相遇，用了 ' + costStr + ' 颗星钻',
    world_exploration: '\u{1F30D} 为了探索新世界，用了 ' + costStr + ' 颗星钻',
    membership_renewal: '\u{2728} 为了继续陪伴，用了 ' + costStr + ' 颗星钻',
  };
  return messages[type];
}

export function computeEmotionalResonance(
  type: SoftConsumptionType,
  relationshipWarmth: number,
  isVip: boolean,
): number {
  const baseResonance: Record<SoftConsumptionType, number> = {
    chat_message: 1, character_creation: 5, world_exploration: 3, membership_renewal: 8,
  };
  let resonance = baseResonance[type];
  resonance *= 0.5 + (relationshipWarmth / 200);
  if (isVip) resonance *= 1.5;
  return Math.round(resonance);
}