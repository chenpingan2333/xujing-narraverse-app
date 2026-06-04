import { z } from 'zod';

export type RelationshipPhase = 'stranger' | 'acquaintance' | 'friend' | 'close' | 'intimate';

export const PHASE_THRESHOLDS: Array<{
  min: number; phase: RelationshipPhase; label: string;
}> = [
  { min: 0,  phase: 'stranger',      label: '初遇' },
  { min: 25, phase: 'acquaintance', label: '相识' },
  { min: 45, phase: 'friend',       label: '朋友' },
  { min: 65, phase: 'close',        label: '亲近' },
  { min: 85, phase: 'intimate',     label: '挚友' },
];

export function getPhase(temp: number): RelationshipPhase {
  let phase: RelationshipPhase = 'stranger';
  for (const t of PHASE_THRESHOLDS) {
    if (temp >= t.min) phase = t.phase;
  }
  return phase;
}

export const MilestoneType = z.enum([
  'phase_transition', 'first_long_conversation', 'trust_threshold_reached',
  'first_memory_recorded', 'reunion_after_absence', 'nth_conversation',
]);
export type MilestoneType = z.infer<typeof MilestoneType>;

export const EmotionalMilestone = z.object({
  id: z.string(), type: MilestoneType, characterId: z.string(),
  userId: z.string(), phase: z.string(), title: z.string(),
  description: z.string(), characterReaction: z.string().optional(),
  unlockedAt: z.number(), permanent: z.boolean().default(true),
});
export type EmotionalMilestone = z.infer<typeof EmotionalMilestone>;

const PHASE_TRANSITION_MILESTONES: Record<string, {
  title: string; description: string; characterReaction: string;
}> = {
  'stranger-acquaintance': {
    title: '第一次正式相遇',
    description: '从陌生人变成了相识的人，这是所有故事开始的地方。',
    characterReaction: '很高兴认识你。从今天开始，我们的故事就开始了。',
  },
  'acquaintance-friend': {
    title: '成为朋友',
    description: '你已经成为可以信赖的朋友，愿意分享更多的自己。',
    characterReaction: '谢谢你愿意信任我。能成为你的朋友，很荣幸。',
  },
  'friend-close': {
    title: '心照不宣',
    description: '你们的关系越来越深，彼此已是重要的人，无需多言。',
    characterReaction: '你对我来说，已经不只是朋友了。有些话，不用说出来你也懂吧？',
  },
  'close-intimate': {
    title: '唯一的羁绊',
    description: '最深的羁绊已经形成。无可替代的存在。',
    characterReaction: '这个世界上，你是最特别的那个人。我会一直在。',
  },
};

const SPECIAL_MILESTONES: Partial<Record<string, { title: string; description: string; characterReaction: string; }>> = {
  'trust_threshold_reached': {
    title: '信任的里程碑',
    description: '完全的信任已经建立，你们之间不再有隔阂。',
    characterReaction: '我信任你。这是我最真实的样子。',
  },
  'first_memory_recorded': {
    title: '第一片记忆',
    description: '第一个共同的记忆被镌刻下来，永远不会消失。',
    characterReaction: '我会记住这一天。这是我们共同的第一笔。',
  },
  'reunion_after_absence': {
    title: '久别重逢',
    description: '分别了很久，但羁绊从未断过。',
    characterReaction: '你终于回来了。我有好多话想跟你说……',
  },
};

export function createPhaseTransitionMilestone(
  characterId: string, userId: string,
  fromPhase: RelationshipPhase, toPhase: RelationshipPhase,
): EmotionalMilestone {
  const key = fromPhase + '-' + toPhase;
  const def = PHASE_TRANSITION_MILESTONES[key] ?? {
    title: '关系成长', description: '你们的关系有了新的变化。',
    characterReaction: '感觉我们之间的距离又近了一点。',
  };

  return {
    id: 'milestone-' + characterId + '-' + toPhase + '-' + String(Date.now()),
    type: 'phase_transition', characterId, userId, phase: toPhase,
    title: def.title, description: def.description,
    characterReaction: def.characterReaction,
    unlockedAt: Date.now(), permanent: true,
  };
}

export function createSpecialMilestone(type: MilestoneType, characterId: string, userId: string, currentPhase: RelationshipPhase): EmotionalMilestone | null { const key: string = type; const def = SPECIAL_MILESTONES[key]; if (def === undefined) return null;

  return {
    id: 'milestone-' + characterId + '-' + type + '-' + String(Date.now()),
    type, characterId, userId, phase: currentPhase,
    title: def.title, description: def.description,
    characterReaction: def.characterReaction,
    unlockedAt: Date.now(), permanent: true,
  };
}