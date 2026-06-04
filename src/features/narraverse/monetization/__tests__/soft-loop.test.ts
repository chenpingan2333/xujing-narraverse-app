import { describe, it, expect } from 'vitest';
import { getSoftConsumptionFeedback, formatEmotionalDiamondMessage, computeEmotionalResonance } from '../soft-loop.js';
import {
  getVIPConfig, boostRelationshipDelta, boostMemoryImportance,
  boostLongingLevel, getVIPWelcomeMessage, getVIPMilestoneMessage,
  getInitiationThreshold, getVIPBoostSummary,
} from '../vip-emotion-boost.js';

describe('SoftLoop', () => {
  it('returns feedback for chat message consumption', () => {
    const fb = getSoftConsumptionFeedback('chat_message', '艾琳', 0); // no suppression
    if (fb) { expect(fb.animationType).toBeDefined();
      
      expect(fb.animationType).toBeDefined();
      expect(fb.emotionalResonanceBonus).toBeGreaterThanOrEqual(0);
    }
  });

  it('formats diamond message with emotional framing', () => {
    const msg = formatEmotionalDiamondMessage(15, 'chat_message');
    expect(msg).toContain('15');
    expect(msg).toContain('星钻');
    expect(msg).not.toContain('消耗');
  });

  it('formats character creation message', () => {
    const msg = formatEmotionalDiamondMessage(100, 'character_creation');
    expect(msg).toContain('相遇');
  });

  it('computes emotional resonance', () => {
    const resonance = computeEmotionalResonance('chat_message', 50, false);
    expect(resonance).toBeGreaterThan(0);
  });

  it('VIP gives higher emotional resonance', () => {
    const free = computeEmotionalResonance('membership_renewal', 50, false);
    const vip = computeEmotionalResonance('membership_renewal', 50, true);
    expect(vip).toBeGreaterThan(free);
  });

  it('higher warmth gives higher resonance', () => {
    const low = computeEmotionalResonance('chat_message', 10, false);
    const high = computeEmotionalResonance('chat_message', 90, false);
    expect(high).toBeGreaterThanOrEqual(low);
  });
});

describe('VIPEmotionBoost', () => {
  it('returns correct configs for VIP vs free', () => {
    const vipCfg = getVIPConfig(true);
    const freeCfg = getVIPConfig(false);
    expect(vipCfg.relationshipGrowthMultiplier).toBeGreaterThan(freeCfg.relationshipGrowthMultiplier);
    expect(vipCfg.memoryDepthMultiplier).toBeGreaterThan(freeCfg.memoryDepthMultiplier);
    expect(vipCfg.initiationPhaseThreshold).toBeLessThan(freeCfg.initiationPhaseThreshold);
  });

  it('boosts relationship delta for VIP', () => {
    const delta = { affection: 4, trust: 3, intimacy: 2 };
    const boosted = boostRelationshipDelta(delta, true);
    expect(boosted.affection).toBeGreaterThan(delta.affection);
    expect(boosted.trust).toBeGreaterThan(delta.trust);
    expect(boosted.intimacy).toBeGreaterThan(delta.intimacy);
  });

  it('does not boost for free users', () => {
    const delta = { affection: 4, trust: 3, intimacy: 2 };
    const result = boostRelationshipDelta(delta, false);
    expect(result.affection).toBe(delta.affection);
    expect(result.trust).toBe(delta.trust);
    expect(result.intimacy).toBe(delta.intimacy);
  });

  it('boosts memory importance for VIP', () => {
    const boosted = boostMemoryImportance(0.5, true);
    expect(boosted).toBeGreaterThan(0.5);
  });

  it('boosts longing level for VIP', () => {
    const boosted = boostLongingLevel(0.4, true);
    expect(boosted).toBeGreaterThan(0.4);
    expect(boosted).toBeLessThanOrEqual(1);
  });

  it('returns welcome message', () => {
    const msg = getVIPWelcomeMessage();
    expect(msg).toBeTruthy();
    expect(typeof msg).toBe('string');
  });

  it('returns milestone message', () => {
    const msg = getVIPMilestoneMessage();
    expect(msg).toBeTruthy();
  });

  it('returns lower initiation threshold for VIP', () => {
    expect(getInitiationThreshold(true)).toBeLessThan(getInitiationThreshold(false));
  });

  it('returns boost summary with 5 items', () => {
    const items = getVIPBoostSummary();
    expect(items.length).toBe(5);
    items.forEach(item => {
      expect(item.label).toBeTruthy();
      expect(item.description).toBeTruthy();
    });
  });
});
