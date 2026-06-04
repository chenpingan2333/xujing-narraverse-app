import type { RelationshipPhase } from './milestones.js';
import { getPhase } from './milestones.js';
import type { EmotionalMilestone } from './milestones.js';
import { createPhaseTransitionMilestone, createSpecialMilestone } from './milestones.js';
import type { EchoMessage } from '../engagement/mood-engine.js';
import { getMilestoneEcho } from '../engagement/daily-loop.js';

interface EventMemory {
  conversationCount: number;
  lastPhase: RelationshipPhase;
  milestones: string[];
  reunionDetected: boolean;
  trustMilestoneTriggered: boolean;
  memoryMilestoneTriggered: boolean;
}

const eventMemories = new Map<string, EventMemory>();

function eventKey(userId: string, characterId: string): string {
  return userId + '::' + characterId;
}

function getMemory(userId: string, characterId: string): EventMemory {
  const key = eventKey(userId, characterId);
  if (!eventMemories.has(key)) {
    eventMemories.set(key, {
      conversationCount: 0,
      lastPhase: 'stranger',
      milestones: [],
      reunionDetected: false,
      trustMilestoneTriggered: false,
      memoryMilestoneTriggered: false,
    });
  }
  const mem = eventMemories.get(key); if (!mem) throw new Error('unreachable'); return mem;
}

export function clearEventMemories(): void {
  eventMemories.clear();
}

export interface EventTriggerResult {
  milestones: EmotionalMilestone[];
  echoes: EchoMessage[];
  characterInitiatesConversation: boolean;
  unlockedNickname?: string;
}

const PHASE_NICKNAMES: Record<RelationshipPhase, string[]> = {
  stranger: [],
  acquaintance: ['你'],
  friend: ['朋友', '伙伴', '搭档'],
  close: ['你呀', '笨蛋', '傻瓜', '亲爱的朋友'],
  intimate: ['你', '唯一', '最重要的你', '心之所系'],
};

export interface TriggerInput {
  userId: string;
  characterId: string;
  characterName: string;
  affection: number;
  trust: number;
  intimacy: number;
  conversationCount: number;
  hasNewMemory: boolean;
  isVip: boolean;
  daysSinceLastVisit?: number;
}

export function evaluateRelationshipEvents(input: TriggerInput): EventTriggerResult {
  const {
    userId, characterId, characterName,
    affection, trust, intimacy,
    conversationCount, hasNewMemory, isVip,
    daysSinceLastVisit,
  } = input;

  const memory = getMemory(userId, characterId);
  const overallTemp = Math.round((affection + trust + intimacy) / 3);
  const currentPhase = getPhase(overallTemp);

  const milestones: EmotionalMilestone[] = [];
  const echoes: EchoMessage[] = [];
  let characterInitiatesConversation = false;
  let unlockedNickname: string | undefined;

  if (currentPhase !== memory.lastPhase) {
    const milestone = createPhaseTransitionMilestone(
      characterId, userId, memory.lastPhase, currentPhase,
    );
    if (!memory.milestones.includes(milestone.id)) {
      milestones.push(milestone);
      memory.milestones.push(milestone.id);
    }

    const echo = getMilestoneEcho(characterId, characterName, memory.lastPhase, currentPhase, userId);
    if (echo) echoes.push(echo);

    const nicknames = PHASE_NICKNAMES[currentPhase];
    if (nicknames.length > 0) {
      unlockedNickname = nicknames[Math.floor(Math.random() * nicknames.length)];
    }

    if (currentPhase === 'close' || currentPhase === 'intimate') {
      characterInitiatesConversation = true;
    }

    if (isVip && currentPhase === 'friend') {
      characterInitiatesConversation = true;
    }

    memory.lastPhase = currentPhase;
  }

  if (trust >= 60 && !memory.trustMilestoneTriggered) {
    const milestone = createSpecialMilestone('trust_threshold_reached', characterId, userId, currentPhase);
    if (milestone && !memory.milestones.includes(milestone.id)) {
      milestones.push(milestone);
      memory.milestones.push(milestone.id);
      memory.trustMilestoneTriggered = true;
    }
  }

  if (hasNewMemory && !memory.memoryMilestoneTriggered && conversationCount > 1) {
    const milestone = createSpecialMilestone('first_memory_recorded', characterId, userId, currentPhase);
    if (milestone && !memory.milestones.includes(milestone.id)) {
      milestones.push(milestone);
      memory.milestones.push(milestone.id);
      memory.memoryMilestoneTriggered = true;
    }
  }

  if (daysSinceLastVisit && daysSinceLastVisit > 7 && !memory.reunionDetected) {
    const milestone = createSpecialMilestone('reunion_after_absence', characterId, userId, currentPhase);
    if (milestone && !memory.milestones.includes(milestone.id)) {
      milestones.push(milestone);
      memory.milestones.push(milestone.id);
      memory.reunionDetected = true;
    }
    characterInitiatesConversation = true;
  }

  memory.conversationCount = conversationCount;
  eventMemories.set(eventKey(userId, characterId), memory);

  return {
    milestones,
    echoes,
    characterInitiatesConversation,
    unlockedNickname,
  };
}