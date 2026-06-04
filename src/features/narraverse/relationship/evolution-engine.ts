import type { RelationshipPhase } from './milestones.js';
import { getPhase } from './milestones.js';
import type { EmotionalMilestone } from './milestones.js';
import { evaluateRelationshipEvents } from './event-trigger.js';

export interface MemoryGraphNode {
  id: string;
  type: 'conversation' | 'milestone' | 'echo' | 'memory_event';
  timestamp: number;
  phase: RelationshipPhase;
  summary: string;
  affectionDelta: number;
  trustDelta: number;
  intimacyDelta: number;
}

export interface EvolutionState {
  userId: string;
  characterId: string;
  characterName: string;
  currentPhase: RelationshipPhase;
  previousPhase: RelationshipPhase;
  overallTemp: number;
  milestones: EmotionalMilestone[];
  memoryGraph: MemoryGraphNode[];
  conversationCount: number;
  characterInitiatesConversation: boolean;
  unlockedNicknames: string[];
  isVip: boolean;
}

const evolutionStates = new Map<string, EvolutionState>();

function evoKey(userId: string, characterId: string): string {
  return userId + '::' + characterId;
}

export function getEvolutionState(userId: string, characterId: string): EvolutionState | undefined {
  return evolutionStates.get(evoKey(userId, characterId));
}

export function clearAllEvolutionStates(): void {
  evolutionStates.clear();
}

export interface EvolutionInput {
  userId: string;
  characterId: string;
  characterName: string;
  affection: number;
  trust: number;
  intimacy: number;
  isVip: boolean;
  hasNewMemory: boolean;
  daysSinceLastVisit?: number;
}

export interface EvolutionResult {
  state: EvolutionState;
  newMilestones: EmotionalMilestone[];
  phaseChanged: boolean;
  characterInitiatesConversation: boolean;
  unlockedNickname?: string;
}

export function evolveRelationship(input: EvolutionInput): EvolutionResult {
  const {
    userId, characterId, characterName,
    affection, trust, intimacy, isVip,
    hasNewMemory, daysSinceLastVisit,
  } = input;

  const key = evoKey(userId, characterId);
  const existing = evolutionStates.get(key);
  const conversationCount = (existing?.conversationCount ?? 0) + 1;

  const overallTemp = Math.round((affection + trust + intimacy) / 3);
  const previousPhase = existing?.currentPhase ?? 'stranger';
  const currentPhase = getPhase(overallTemp);

  const events = evaluateRelationshipEvents({
    userId, characterId, characterName,
    affection, trust, intimacy,
    conversationCount, hasNewMemory, isVip,
    daysSinceLastVisit,
  });

  const state: EvolutionState = {
    userId,
    characterId,
    characterName,
    currentPhase,
    previousPhase,
    overallTemp,
    milestones: [
      ...(existing?.milestones ?? []),
      ...events.milestones,
    ],
    memoryGraph: [
      ...(existing?.memoryGraph ?? []),
      ...events.milestones.map(m => ({
        id: m.id, type: 'milestone' as const,
        timestamp: m.unlockedAt, phase: currentPhase,
        summary: m.title, affectionDelta: 0, trustDelta: 0, intimacyDelta: 0,
      })),
    ],
    conversationCount,
    characterInitiatesConversation: events.characterInitiatesConversation,
    unlockedNicknames: [
      ...(existing?.unlockedNicknames ?? []),
      ...(events.unlockedNickname ? [events.unlockedNickname] : []),
    ],
    isVip,
  };

  evolutionStates.set(key, state);

  return {
    state,
    newMilestones: events.milestones,
    phaseChanged: currentPhase !== previousPhase,
    characterInitiatesConversation: events.characterInitiatesConversation,
    unlockedNickname: events.unlockedNickname,
  };
}

export function recordMemoryNode(
  userId: string,
  characterId: string,
  node: MemoryGraphNode,
): void {
  const key = evoKey(userId, characterId);
  const existing = evolutionStates.get(key);
  if (existing) {
    existing.memoryGraph.push(node);
    evolutionStates.set(key, existing);
  }
}