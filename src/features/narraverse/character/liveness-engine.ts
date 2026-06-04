import type {
  InternalState,
  InternalMonologue,
  MemoryFragment,
  EmotionalTone,
} from "./internal-state.js";
import {
  createInternalState,
  generateMonologue,
  pickActivity,
  pickTimeOfDayActivity,
  mapPersonaToTone,
  generateAbsenceReflection,
  generateMemoryReflection,
  generateMoodShiftReflection,
  generateTimePassageReflection,
} from "./internal-state.js";
import type { DailyMood } from "../engagement/mood-engine.js";

const livenessStates = new Map<string, InternalState>();

export function getLivenessState(characterId: string): InternalState | undefined {
  return livenessStates.get(characterId);
}

export function setLivenessState(characterId: string, state: InternalState): void {
  livenessStates.set(characterId, state);
}

export function clearLivenessStates(): void {
  livenessStates.clear();
}

export interface LivenessTickInput {
  characterId: string;
  personaMood: string;
  dailyMood: DailyMood;
  elapsedMs: number;
  recentUserContent?: string;
  isVip: boolean;
}

export interface LivenessTickResult {
  state: InternalState;
  newMonologue: InternalMonologue | null;
  newMemoryFragment: MemoryFragment | null;
  toneShifted: boolean;
  activityChanged: boolean;
}

export function livenessTick(input: LivenessTickInput): LivenessTickResult {
  const { characterId, personaMood, dailyMood, elapsedMs, recentUserContent, isVip } = input;

  let state = livenessStates.get(characterId);
  if (!state) {
    state = createInternalState(characterId, personaMood);
  }

  const hoursElapsed = elapsedMs / (1000 * 60 * 60);
  const now = Date.now();

  let newMonologue: InternalMonologue | null = null;
  let newMemoryFragment: MemoryFragment | null = null;
  let toneShifted = false;
  let activityChanged = false;

  const moodToTone: Record<string, EmotionalTone> = {
    happy: "cheerful", thoughtful: "neutral", lonely: "longing",
    excited: "cheerful", calm: "neutral", wistful: "melancholic",
    energetic: "cheerful", gentle: "warm",
  };
  const targetTone = moodToTone[dailyMood.mood] ?? mapPersonaToTone(personaMood);
  const previousTone = state.currentTone;

  if (targetTone !== previousTone && dailyMood.intensity > 0.5) {
    state.currentTone = targetTone;
    toneShifted = true;

    // Phase 7: generate mood-shift reflection on tone change
    const existingReflectionContents = state.reflections.map((r) => r.reflection);
    const moodReflection = generateMoodShiftReflection(existingReflectionContents);
    if (moodReflection) {
      state.reflections = [...state.reflections.slice(-19), moodReflection];
    }
  }

  // Monologue generation
  const monologueInterval = isVip ? 2 : 4;
  if (hoursElapsed >= monologueInterval) {
    const existingThoughts = state.monologue.map((m) => m.thought);
    const monologue = generateMonologue(state.currentTone, existingThoughts);
    if (monologue) {
      state.monologue = [...state.monologue.slice(-19), monologue];
      newMonologue = monologue;
    }
  }

  // Phase 7: Passive memory fragments from user content (existing behavior, polished)
  if (recentUserContent && recentUserContent.length > 0 && Math.random() < 0.3) {
    const truncated = recentUserContent.slice(0, 80) + (recentUserContent.length > 80 ? "..." : "");
    const fragment: MemoryFragment = {
      content: '用户说过的话："' + truncated + '"',
      source: "conversation",
      emotionalWeight: dailyMood.intensity,
      createdAt: now,
      resonanceFrequency: isVip ? 0.6 : 0.35,
    };
    state.privateFragments = [...state.privateFragments.slice(-49), fragment];
    newMemoryFragment = fragment;
  }

  // Phase 7: Passive memory fragments during user absence
  // When the character is alone, they form internal memory fragments
  if (!recentUserContent && dailyMood.passiveDays >= 2 && Math.random() < 0.25) {
    const existingReflectionContents = state.reflections.map((r) => r.reflection);
    const reflection = generateAbsenceReflection(dailyMood.passiveDays, existingReflectionContents);
    if (reflection) {
      state.reflections = [...state.reflections.slice(-19), reflection];

      // Also create an internal memory fragment from the reflection
      const fragment: MemoryFragment = {
        content: '内心回响：' + reflection.reflection.slice(0, 60),
        source: "internal",
        emotionalWeight: reflection.intensity,
        createdAt: now,
        resonanceFrequency: isVip ? 0.5 : 0.25,
      };
      state.privateFragments = [...state.privateFragments.slice(-49), fragment];
      if (!newMemoryFragment) newMemoryFragment = fragment;
    }
  }

  // Phase 7: Time-passage reflections for long offline periods
  if (hoursElapsed >= 12 && Math.random() < 0.2) {
    const existingReflectionContents = state.reflections.map((r) => r.reflection);
    const tpReflection = generateTimePassageReflection(existingReflectionContents);
    if (tpReflection) {
      state.reflections = [...state.reflections.slice(-19), tpReflection];
    }
  }

  // Phase 7: Spontaneous memory reflections (VIP gets more)
  const memoryReflectionChance = isVip ? 0.15 : 0.05;
  if (hoursElapsed >= 8 && Math.random() < memoryReflectionChance) {
    const existingReflectionContents = state.reflections.map((r) => r.reflection);
    const memReflection = generateMemoryReflection(existingReflectionContents);
    if (memReflection) {
      state.reflections = [...state.reflections.slice(-19), memReflection];
    }
  }

  // Activity changes: use time-of-day activities (Phase 7)
  if (hoursElapsed >= 4) {
    state.currentActivity = pickTimeOfDayActivity(personaMood);
    activityChanged = true;
  }

  state.innerActivity = Math.min(
    1,
    0.3 + dailyMood.longingLevel * 0.4 + dailyMood.intensity * 0.3,
  );

  state.lastUpdated = now;
  livenessStates.set(characterId, state);

  return {
    state,
    newMonologue,
    newMemoryFragment,
    toneShifted,
    activityChanged,
  };
}

export function getCharacterStatus(state: InternalState): string {
  return state.currentActivity;
}

export function getLivenessContext(
  characterId: string,
  characterName: string,
): string {
  const state = livenessStates.get(characterId);
  if (!state) return "";

  const recentMonologue = state.monologue.slice(-3);
  const toneLabel: Record<string, string> = {
    warm: "内心温暖", cool: "内心冷静", neutral: "内心平和",
    melancholic: "内心有些感伤", cheerful: "内心充满喜悦",
    mysterious: "内心深邃", longing: "内心在等待",
  };

  const monologueText = recentMonologue.length > 0
    ? '最近内心的想法："' + recentMonologue.map((m) => m.thought).join("；") + '"'
    : "";

  // Phase 7: include emotional reflections in context
  const recentReflections = state.reflections.slice(-2);
  const reflectionText = recentReflections.length > 0
    ? '内心的回响："' + recentReflections.map((r) => r.reflection).join("；") + '"'
    : "";

  return [
    "[" + characterName + "的内心状态]",
    "当前心境：" + (toneLabel[state.currentTone] ?? state.currentTone),
    "正在做的事：" + state.currentActivity,
    monologueText,
    reflectionText,
  ].filter(Boolean).join("\n");
}
