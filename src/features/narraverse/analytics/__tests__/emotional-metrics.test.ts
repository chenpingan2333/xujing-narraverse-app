import { describe, it, expect, beforeEach } from 'vitest';
import {
  trackDailyActiveCharacter, trackRelationshipGrowth, trackEmotionFeedback,
  trackReturnReengagement, trackVIPImpact, trackEchoDelivery,
  getDailyActiveCharacterCount, getAverageRelationshipGrowth,
  getEmotionFeedbackRate, getReengagementRate, getVIPGrowthRatio,
  clearAllMetrics,
} from '../emotional-metrics.js';

describe('EmotionalMetrics', () => {
  beforeEach(() => { clearAllMetrics(); });

  it('tracks daily active characters', () => {
    trackDailyActiveCharacter('user-1', 'char-001');
    trackDailyActiveCharacter('user-1', 'char-002');
    const count = getDailyActiveCharacterCount();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('tracks relationship growth', () => {
    trackRelationshipGrowth('user-1', 'char-001', 3, 2, 1);
    const avg = getAverageRelationshipGrowth();
    expect(avg).toBeGreaterThanOrEqual(6);
  });

  it('tracks emotion feedback trigger', () => {
    trackEmotionFeedback('user-1', 'char-001', 'longing', true);
    trackEmotionFeedback('user-1', 'char-001', 'milestone', false);
    const rate = getEmotionFeedbackRate();
    expect(rate).toBe(0.5);
  });

  it('tracks return reengagement', () => {
    trackReturnReengagement('user-1', 8, 'char-001');
    trackReturnReengagement('user-2', 3, null);
    const rate = getReengagementRate();
    expect(rate).toBe(0.5);
  });

  it('tracks VIP emotional impact', () => {
    trackVIPImpact('user-1', 'char-001', true, 10, 8, 6);
    trackVIPImpact('user-2', 'char-002', false, 4, 3, 2);
    const ratio = getVIPGrowthRatio();
    expect(ratio).toBeGreaterThan(0);
  });

  it('tracks echo delivery', () => {
    trackEchoDelivery('user-1', 'char-001', 'echo-1', 'longing', true, null);
    trackEchoDelivery('user-1', 'char-001', 'echo-2', 'memory-echo', false, 5000);
  });

  it('average growth returns 0 for empty data', () => {
    const avg = getAverageRelationshipGrowth('2020-01-01');
    expect(avg).toBe(0);
  });

  it('feedback rate returns 0 for empty data', () => {
    const rate = getEmotionFeedbackRate();
    expect(rate).toBe(0);
  });

  it('reengagement rate returns 0 for empty data', () => {
    const rate = getReengagementRate();
    expect(rate).toBe(0);
  });
});