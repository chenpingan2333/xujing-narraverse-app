import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateRelationshipEvents, clearEventMemories } from '../event-trigger.js';
import { evolveRelationship, clearAllEvolutionStates } from '../evolution-engine.js';
import { getPhase, createPhaseTransitionMilestone, createSpecialMilestone, PHASE_THRESHOLDS } from '../milestones.js';

describe('Milestones', () => {
  it('getPhase returns correct phase for each threshold', () => {
    expect(getPhase(0)).toBe('stranger');
    expect(getPhase(25)).toBe('acquaintance');
    expect(getPhase(45)).toBe('friend');
    expect(getPhase(65)).toBe('close');
    expect(getPhase(85)).toBe('intimate');
  });

  it('all phases defined in thresholds', () => {
    expect(PHASE_THRESHOLDS.length).toBe(5);
    const phases = PHASE_THRESHOLDS.map(t => t.phase);
    expect(phases).toEqual(['stranger', 'acquaintance', 'friend', 'close', 'intimate']);
  });

  it('creates phase transition milestone with good data', () => {
    const m = createPhaseTransitionMilestone('char-001', 'user-1', 'stranger', 'acquaintance');
    expect(m.type).toBe('phase_transition');
    expect(m.phase).toBe('acquaintance');
    expect(m.title).toBeTruthy();
    expect(m.characterReaction).toBeTruthy();
    expect(m.permanent).toBe(true);
  });

  it('creates trust milestone', () => {
    const m = createSpecialMilestone('trust_threshold_reached', 'char-001', 'user-1', 'friend');
    expect(m).not.toBeNull();
    if (m) expect(m.type).toBe('trust_threshold_reached');
  });

  it('returns null for unknown special milestone', () => {
    const m = createSpecialMilestone('nth_conversation', 'char-001', 'user-1', 'friend');
    expect(m).toBeNull();
  });
});

describe('EventTrigger', () => {
  beforeEach(() => { clearEventMemories(); });

  it('detects phase transition on first evaluation', () => {
    const result = evaluateRelationshipEvents({
      userId: 'user-1', characterId: 'char-001', characterName: '艾琳',
      affection: 50, trust: 50, intimacy: 50,
      conversationCount: 3, hasNewMemory: false, isVip: false,
    });
    expect(result.milestones.length).toBeGreaterThanOrEqual(1);
    expect(result.milestones.find(m => m.type === 'phase_transition')).toBeTruthy();
  });

  it('unlocks nickname at close phase', () => {
    const result = evaluateRelationshipEvents({
      userId: 'user-1', characterId: 'char-001', characterName: '艾琳',
      affection: 70, trust: 70, intimacy: 70,
      conversationCount: 5, hasNewMemory: false, isVip: false,
    });
    expect(result.unlockedNickname).toBeTruthy();
    expect(result.characterInitiatesConversation).toBe(true);
  });

  it('reunion after long absence triggers event', () => {
    const result = evaluateRelationshipEvents({
      userId: 'user-1', characterId: 'char-001', characterName: '艾琳',
      affection: 40, trust: 40, intimacy: 40,
      conversationCount: 2, hasNewMemory: false, isVip: false,
      daysSinceLastVisit: 10,
    });
    expect(result.milestones.some(m => m.type === 'reunion_after_absence')).toBe(true);
  });

  it('trust threshold milestone fires when trust >= 60', () => {
    const result = evaluateRelationshipEvents({
      userId: 'user-1', characterId: 'char-001', characterName: '艾琳',
      affection: 50, trust: 65, intimacy: 50,
      conversationCount: 4, hasNewMemory: false, isVip: false,
    });
    expect(result.milestones.some(m => m.type === 'trust_threshold_reached')).toBe(true);
  });
});

describe('EvolutionEngine', () => {
  beforeEach(() => { clearAllEvolutionStates(); clearEventMemories(); });

  it('evolves relationship through first interaction', () => {
    const result = evolveRelationship({
      userId: 'user-1', characterId: 'char-001', characterName: '艾琳',
      affection: 50, trust: 50, intimacy: 50,
      isVip: false, hasNewMemory: true,
    });
    expect(result.state.conversationCount).toBe(1);
    expect(result.state.currentPhase).toBe('friend');
    expect(result.phaseChanged).toBe(true);
  });

  it('maintains state across multiple interactions', () => {
    evolveRelationship({
      userId: 'user-1', characterId: 'char-001', characterName: '艾琳',
      affection: 30, trust: 30, intimacy: 30,
      isVip: false, hasNewMemory: false,
    });
    const r2 = evolveRelationship({
      userId: 'user-1', characterId: 'char-001', characterName: '艾琳',
      affection: 50, trust: 50, intimacy: 50,
      isVip: false, hasNewMemory: true,
    });
    expect(r2.state.conversationCount).toBe(2);
  });

  it('records memory nodes in graph', () => {
    const result = evolveRelationship({
      userId: 'user-2', characterId: 'char-002', characterName: '雷恩',
      affection: 50, trust: 50, intimacy: 50,
      isVip: false, hasNewMemory: true,
    });
    expect(result.state.memoryGraph.length).toBeGreaterThan(0);
  });

  it('accumulates unlocked nicknames', () => {
    const r1 = evolveRelationship({
      userId: 'user-1', characterId: 'char-001', characterName: '艾琳',
      affection: 70, trust: 70, intimacy: 70,
      isVip: false, hasNewMemory: false,
    });
    expect(r1.state.unlockedNicknames.length).toBeGreaterThan(0);
  });
});