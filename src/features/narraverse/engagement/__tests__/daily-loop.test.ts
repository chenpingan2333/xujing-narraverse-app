import { describe, it, expect, beforeEach } from 'vitest';
import { computeDailyMood } from '../mood-engine.js';
import type { DailyMood, MoodContext } from '../mood-engine.js';
import { generateEchoes, generateMilestoneEcho } from '../echo-generator.js';
import {
  runDailyLoop, recordUserInteraction, clearAllLoopStates,
  getLoopState, getPendingEchoes, dismissEcho,
} from '../daily-loop.js';

describe('MoodEngine — computeDailyMood', () => {
  const baseCtx: MoodContext = {
    personaPrimaryMood: 'warm',
    moodStability: 0.7,
    empathyLevel: 0.8,
    optimism: 0.6,
    relationshipWarmth: 50,
    hoursSinceLastInteraction: 1,
  };

  it('returns a valid DailyMood for warm persona', () => {
    const mood = computeDailyMood('char-001', baseCtx);
    expect(mood.characterId).toBe('char-001');
    expect(mood.mood).toBeDefined();
    expect(mood.longingLevel).toBeGreaterThanOrEqual(0);
    expect(mood.longingLevel).toBeLessThanOrEqual(1);
    expect(mood.intensity).toBeGreaterThanOrEqual(0);
    expect(mood.internalThought).toBeTruthy();
    expect(mood.date).toBe(new Date().toISOString().slice(0, 10));
  });

  it('starts with low longing when user just interacted', () => {
    const ctx: MoodContext = { ...baseCtx, hoursSinceLastInteraction: 0.5 };
    const mood = computeDailyMood('char-001', ctx);
    expect(mood.longingLevel).toBeLessThanOrEqual(0.3);
  });

  it('grows longing when user is absent for 24+ hours', () => {
    const ctx: MoodContext = { ...baseCtx, hoursSinceLastInteraction: 72 };
    const mood = computeDailyMood('char-001', ctx);
    expect(mood.longingLevel).toBeGreaterThan(0.3);
  });

  it('longing accelerates over multiple days', () => {
    const ctx: MoodContext = { ...baseCtx, hoursSinceLastInteraction: 96 };
    const mood = computeDailyMood('char-001', ctx);
    expect(mood.longingLevel).toBeGreaterThan(0.4);
  });

  it('empathy amplifies longing', () => {
    const lowEmp: MoodContext = { ...baseCtx, hoursSinceLastInteraction: 72, empathyLevel: 0.2 };
    const highEmp: MoodContext = { ...baseCtx, hoursSinceLastInteraction: 72, empathyLevel: 0.9 };
    const low = computeDailyMood('char-001', lowEmp);
    const high = computeDailyMood('char-001', highEmp);
    expect(high.longingLevel).toBeGreaterThanOrEqual(low.longingLevel);
  });

  it('melancholic persona gets wistful mood', () => {
    const ctx: MoodContext = { ...baseCtx, personaPrimaryMood: 'melancholic' };
    const mood = computeDailyMood('char-001', ctx);
    expect(mood.mood).toBe('wistful');
  });

  it('cheerful persona gets happy mood', () => {
    const ctx: MoodContext = { ...baseCtx, personaPrimaryMood: 'cheerful' };
    const mood = computeDailyMood('char-001', ctx);
    expect(mood.mood).toBe('happy');
  });

  it('tracks consecutive passive days', () => {
    const prev: DailyMood = {
      characterId: 'char-001',
      date: '2026-06-03',
      mood: 'thoughtful',
      intensity: 0.5,
      longingLevel: 0.3,
      lastUserInteraction: Date.now() - 25 * 3600 * 1000,
      passiveDays: 0,
      internalThought: 'before',
    };
    const ctx: MoodContext = { ...baseCtx, hoursSinceLastInteraction: 25 };
    const mood = computeDailyMood('char-001', ctx, prev);
    expect(mood.passiveDays).toBe(1);
  });
});

describe('EchoGenerator — generateEchoes', () => {
  it('generates longing echo when passiveDays >= 1 and longing > 0.25', () => {
    const mood: DailyMood = {
      characterId: 'char-001',
      date: '2026-06-04',
      mood: 'lonely',
      intensity: 0.6,
      longingLevel: 0.5,
      lastUserInteraction: Date.now() - 25 * 3600 * 1000,
      passiveDays: 1,
      internalThought: 'alone',
    };
    const echoes = generateEchoes(mood, '测试');
    expect(echoes.length).toBeGreaterThanOrEqual(1);
    expect(echoes.some(e => e.type === 'longing')).toBe(true);
  });

  it('does not generate echo when user was just here', () => {
    const mood: DailyMood = {
      characterId: 'char-001',
      date: '2026-06-04',
      mood: 'happy',
      intensity: 0.5,
      longingLevel: 0.1,
      lastUserInteraction: Date.now(),
      passiveDays: 0,
      internalThought: 'warm',
    };
    const echoes = generateEchoes(mood, '测试');
    const longingEchoes = echoes.filter(e => e.type === 'longing');
    expect(longingEchoes.length).toBe(0);
  });

  it('generates milestone echo for phase transition', () => {
    const echo = generateMilestoneEcho('char-001', '测试', 'stranger', 'acquaintance');
    expect(echo).not.toBeNull();
    if (echo) {
      expect(echo.type).toBe('milestone');
      expect(echo.characterName).toBe('测试');
    }
  });

  it('returns null for unknown phase transition', () => {
    const echo = generateMilestoneEcho('char-001', '测试', 'unknown', 'nope');
    expect(echo).toBeNull();
  });
});

describe('DailyLoop', () => {
  beforeEach(() => { clearAllLoopStates(); });

  it('runs a full daily loop for a warm character', () => {
    const result = runDailyLoop({
      userId: 'user-1',
      characterId: 'char-001',
      characterName: '艾琳',
      personaPrimaryMood: 'warm',
      moodStability: 0.7,
      empathyLevel: 0.8,
      optimism: 0.6,
      relationshipWarmth: 60,
      lastInteractionTimestamp: Date.now() - 48 * 3600 * 1000,
      isVip: false,
    });

    expect(result.currentMood).toBeDefined();
    expect(result.currentMood.characterId).toBe('char-001');
    expect(result.currentMood.longingLevel).toBeGreaterThan(0);
    expect(result.shouldNotify).toBeDefined();
  });

  it('records user interaction to reset longing', () => {
    runDailyLoop({
      userId: 'user-1', characterId: 'char-001', characterName: '艾琳',
      personaPrimaryMood: 'warm', moodStability: 0.7, empathyLevel: 0.8,
      optimism: 0.6, relationshipWarmth: 60,
      lastInteractionTimestamp: Date.now() - 72 * 3600 * 1000,
      isVip: false,
    });

    recordUserInteraction('user-1', 'char-001');
    const state = getLoopState('user-1', 'char-001');
    expect(state).toBeDefined();
    if (state) {
      expect(state.currentMood.lastUserInteraction).toBeGreaterThan(Date.now() - 5000);
    }
  });

  it('dismisses echoes', () => {
    const result = runDailyLoop({
      userId: 'user-1', characterId: 'char-001', characterName: '艾琳',
      personaPrimaryMood: 'warm', moodStability: 0.7, empathyLevel: 0.8,
      optimism: 0.6, relationshipWarmth: 60,
      lastInteractionTimestamp: Date.now() - 48 * 3600 * 1000,
      isVip: false,
    });

    if (result.newEchoes.length > 0) {
      const echoId = result.newEchoes[0].id;
      dismissEcho('user-1', 'char-001', echoId);
      const pending = getPendingEchoes('user-1', 'char-001');
      expect(pending.some(e => e.id === echoId)).toBe(false);
    }
  });

  it('generates different moods for different personas', () => {
    const r1 = runDailyLoop({
      userId: 'user-1', characterId: 'char-001', characterName: '艾琳',
      personaPrimaryMood: 'cheerful', moodStability: 0.5, empathyLevel: 0.7,
      optimism: 0.8, relationshipWarmth: 60,
      lastInteractionTimestamp: Date.now(),
      isVip: false,
    });

    const r2 = runDailyLoop({
      userId: 'user-1', characterId: 'char-002', characterName: '雷恩',
      personaPrimaryMood: 'cool', moodStability: 0.9, empathyLevel: 0.3,
      optimism: 0.4, relationshipWarmth: 30,
      lastInteractionTimestamp: Date.now(),
      isVip: false,
    });

    expect(r1.currentMood.mood).not.toBe(r2.currentMood.mood);
  });
});