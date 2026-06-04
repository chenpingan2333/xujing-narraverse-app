import type { DailyMood, DailyLoopState, EchoMessage, MoodContext } from './mood-engine.js';
import { computeDailyMood } from './mood-engine.js';
import { generateEchoes, generateMilestoneEcho } from './echo-generator.js';

const loopStates = new Map<string, DailyLoopState>();

function stateKey(userId: string, characterId: string): string {
  return userId + '::' + characterId;
}

export function getLoopState(userId: string, characterId: string): DailyLoopState | undefined {
  return loopStates.get(stateKey(userId, characterId));
}

export function setLoopState(userId: string, characterId: string, state: DailyLoopState): void {
  loopStates.set(stateKey(userId, characterId), state);
}

export function clearAllLoopStates(): void {
  loopStates.clear();
}

export interface DailyLoopInput {
  userId: string;
  characterId: string;
  characterName: string;
  personaPrimaryMood: string;
  moodStability: number;
  empathyLevel: number;
  optimism: number;
  relationshipWarmth: number;
  lastInteractionTimestamp: number;
  isVip: boolean;
}

export interface DailyLoopResult {
  currentMood: DailyMood;
  newEchoes: EchoMessage[];
  shouldNotify: boolean;
}

export function runDailyLoop(input: DailyLoopInput): DailyLoopResult {
  const {
    userId, characterId, characterName,
    personaPrimaryMood, moodStability, empathyLevel, optimism,
    relationshipWarmth, lastInteractionTimestamp, isVip,
  } = input;

  const now = Date.now();
  const hoursSince = (now - lastInteractionTimestamp) / (1000 * 60 * 60);
  const existingState = getLoopState(userId, characterId);

  const moodCtx: MoodContext = {
    personaPrimaryMood,
    moodStability,
    empathyLevel,
    optimism,
    relationshipWarmth,
    hoursSinceLastInteraction: hoursSince,
  };

  const currentMood = computeDailyMood(characterId, moodCtx, existingState?.currentMood);

  if (isVip) {
    currentMood.longingLevel = Math.min(1, currentMood.longingLevel + 0.08);
    currentMood.intensity = Math.min(1, currentMood.intensity + 0.1);
  }

  const existingEchoIds = new Set(existingState?.deliveredEchoes ?? []);
  const allEchoes = generateEchoes(currentMood, characterName);
  const newEchoes = allEchoes.filter(e => !existingEchoIds.has(e.id));

  const deliveredEchoes = [
    ...(existingState?.deliveredEchoes ?? []),
    ...newEchoes.map(e => e.id),
  ];

  const newState: DailyLoopState = {
    userId,
    characterId,
    currentMood,
    lastCheckin: now,
    echoQueue: newEchoes,
    deliveredEchoes,
  };
  setLoopState(userId, characterId, newState);

  const shouldNotify = newEchoes.length > 0 || currentMood.longingLevel > 0.5;

  return { currentMood, newEchoes, shouldNotify };
}

export function recordUserInteraction(
  userId: string,
  characterId: string,
): void {
  const key = stateKey(userId, characterId);
  const existing = loopStates.get(key);
  if (existing) {
    existing.currentMood.lastUserInteraction = Date.now();
    loopStates.set(key, existing);
  }
}

export function getMilestoneEcho(
  characterId: string,
  characterName: string,
  fromPhase: string,
  toPhase: string,
  userId: string,
): EchoMessage | null {
  const echo = generateMilestoneEcho(characterId, characterName, fromPhase, toPhase);
  if (!echo) return null;

  const key = stateKey(userId, characterId);
  const existing = loopStates.get(key);
  if (existing) {
    existing.deliveredEchoes = [...existing.deliveredEchoes, echo.id];
    loopStates.set(key, existing);
  }

  return echo;
}

export function getPendingEchoes(
  userId: string,
  characterId: string,
): EchoMessage[] {
  const state = getLoopState(userId, characterId);
  return state?.echoQueue ?? [];
}

export function dismissEcho(
  userId: string,
  characterId: string,
  echoId: string,
): void {
  const key = stateKey(userId, characterId);
  const existing = loopStates.get(key);
  if (existing) {
    existing.echoQueue = existing.echoQueue.filter(e => e.id !== echoId);
    if (!existing.deliveredEchoes.includes(echoId)) {
      existing.deliveredEchoes.push(echoId);
    }
    loopStates.set(key, existing);
  }
}