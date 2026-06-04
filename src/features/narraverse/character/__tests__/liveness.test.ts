import { describe, it, expect, beforeEach } from 'vitest';
import { livenessTick, clearLivenessStates, getCharacterStatus, getLivenessContext } from '../liveness-engine.js';
import { createInternalState, generateMonologue, pickActivity, mapPersonaToTone } from '../internal-state.js';
import type { DailyMood } from '../../engagement/mood-engine.js';

const baseMood: DailyMood = {
  characterId: 'char-001',
  date: '2026-06-04',
  mood: 'happy',
  intensity: 0.6,
  longingLevel: 0.1,
  lastUserInteraction: Date.now(),
  passiveDays: 0,
  internalThought: 'feeling good',
};

describe('InternalState', () => {
  it('creates internal state with correct defaults', () => {
    const state = createInternalState('char-001', 'warm');
    expect(state.characterId).toBe('char-001');
    expect(state.currentTone).toBe('warm');
    expect(state.monologue).toEqual([]);
    expect(state.privateFragments).toEqual([]);
    expect(state.innerActivity).toBe(0.5);
    expect(state.currentActivity).toBeTruthy();
  });

  it('picks activity from correct pool', () => {
    const activity = pickActivity('warm');
    expect(activity).toBeTruthy();
    const activities = ['在窗边看日落', '给花园里的花浇水', '在厨房里煮一壶茶', '翻着一本旧相册', '在听一首安静的歌'];
    expect(activities).toContain(activity);
  });

  it('maps persona mood to tone', () => {
    expect(mapPersonaToTone('warm')).toBe('warm');
    expect(mapPersonaToTone('cheerful')).toBe('cheerful');
    expect(mapPersonaToTone('melancholic')).toBe('melancholic');
    expect(mapPersonaToTone('unknown')).toBe('neutral');
  });

  it('generates monologue without duplicates', () => {
    const m1 = generateMonologue('warm', []);
    expect(m1).not.toBeNull();
    if (m1) {
      expect(m1.tone).toBe('warm');
      const m2 = generateMonologue('warm', [m1.thought]);
      expect(m2).not.toBeNull();
      if (m2) expect(m2.thought).not.toBe(m1.thought);
    }
  });
});

describe('LivenessEngine', () => {
  beforeEach(() => { clearLivenessStates(); });

  it('initializes state on first tick', () => {
    const result = livenessTick({
      characterId: 'char-001',
      personaMood: 'warm',
      dailyMood: baseMood,
      elapsedMs: 3600 * 1000,
      isVip: false,
    });

    expect(result.state.characterId).toBe('char-001');
    expect(result.state.currentTone).toBe('cheerful');
  });

  it('generates monologue after sufficient time', () => {
    const result = livenessTick({
      characterId: 'char-001',
      personaMood: 'warm',
      dailyMood: baseMood,
      elapsedMs: 5 * 3600 * 1000,
      isVip: false,
    });

    expect(result.newMonologue).not.toBeNull();
    expect(result.state.monologue.length).toBeGreaterThanOrEqual(1);
  });

  it('forms memory fragments from user content', () => {
    let fragmentFound = false;
    for (let i = 0; i < 30; i++) {
      const result = livenessTick({
        characterId: 'char-001',
        personaMood: 'warm',
        dailyMood: baseMood,
        elapsedMs: 3600 * 1000,
        recentUserContent: '今天天气真好',
        isVip: false,
      });
      if (result.newMemoryFragment) {
        fragmentFound = true;
        expect(result.newMemoryFragment.source).toBe('conversation');
        break;
      }
    }
    expect(fragmentFound).toBe(true);
  });

  it('shifts tone based on daily mood', () => {
    const lonelyMood: DailyMood = { ...baseMood, mood: 'lonely' };
    const result = livenessTick({
      characterId: 'char-001',
      personaMood: 'warm',
      dailyMood: lonelyMood,
      elapsedMs: 3600 * 1000,
      isVip: false,
    });
    expect(result.toneShifted).toBe(true);
    expect(result.state.currentTone).toBe('longing');
  });

  it('VIP gets richer inner life', () => {
    const result = livenessTick({
      characterId: 'char-001', personaMood: 'mysterious',
      dailyMood: baseMood, elapsedMs: 3 * 3600 * 1000,
      isVip: true,
    });
    expect(result.newMonologue).not.toBeNull();
  });

  it('getCharacterStatus returns current activity', () => {
    const state = createInternalState('char-001', 'warm');
    const status = getCharacterStatus(state);
    expect(status).toBeTruthy();
  });

  it('getLivenessContext returns formatted context', () => {
    livenessTick({
      characterId: 'char-001', personaMood: 'warm',
      dailyMood: baseMood, elapsedMs: 3600 * 1000,
      isVip: false,
    });
    const ctx = getLivenessContext('char-001', '艾琳');
    expect(ctx).toContain('艾琳');
  });

  it('activity changes after 6+ hours', () => {
    const result = livenessTick({
      characterId: 'char-001',
      personaMood: 'warm',
      dailyMood: baseMood,
      elapsedMs: 7 * 3600 * 1000,
      isVip: false,
    });
    expect(result.activityChanged).toBe(true);
  });
});