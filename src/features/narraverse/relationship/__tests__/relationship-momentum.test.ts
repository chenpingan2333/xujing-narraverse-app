import { describe, it, expect } from "vitest";
import {
  computeRelationshipMomentum,
  computeChatFrequency,
  computeMomentumDelta,
} from "../relationship-momentum.js";
import type { MomentumInput } from "../relationship-momentum.js";

describe("computeChatFrequency", () => {
  it("returns 0 for empty interactions", () => {
    expect(computeChatFrequency([])).toBe(0);
  });

  it("returns avg per day for recent interactions", () => {
    const now = Date.now();
    const interactions = [
      { timestamp: now - 1 * 3600 * 1000 },
      { timestamp: now - 6 * 3600 * 1000 },
      { timestamp: now - 48 * 3600 * 1000 },
      { timestamp: now - 72 * 3600 * 1000 },
      { timestamp: now - 120 * 3600 * 1000 },
      { timestamp: now - 144 * 3600 * 1000 },
      { timestamp: now - 160 * 3600 * 1000 },
    ];
    // 7 interactions in 7 days → ~1/day
    const freq = computeChatFrequency(interactions, 7);
    expect(freq).toBeGreaterThan(0.5);
    expect(freq).toBeLessThanOrEqual(1);
  });

  it("filters out interactions outside window", () => {
    const now = Date.now();
    const interactions = [
      { timestamp: now - 1 * 3600 * 1000 },
      { timestamp: now - 200 * 3600 * 1000 }, // outside 7-day window
    ];
    const freq = computeChatFrequency(interactions, 7);
    expect(freq).toBeCloseTo(1 / 7, 1);
  });
});

describe("computeRelationshipMomentum", () => {
  const baseInput: MomentumInput = {
    currentAffection: 60,
    currentTrust: 55,
    currentIntimacy: 45,
    daysSinceLastInteraction: 0,
    chatFrequency: 1.0,
    emotionalIntensity: 0.5,
    isVip: false,
  };

  // ── Decay tests ────────────────────────────────────────────────────

  it("applies no decay when user is active (daysSinceLastInteraction <= 1)", () => {
    const result = computeRelationshipMomentum({
      ...baseInput,
      daysSinceLastInteraction: 0,
    });
    expect(result.decayApplied).toBe(false);
    expect(result.newAffection).toBe(baseInput.currentAffection);
    expect(result.newTrust).toBe(baseInput.currentTrust);
    expect(result.newIntimacy).toBe(baseInput.currentIntimacy);
  });

  it("applies decay when user is away for 2+ days", () => {
    const result = computeRelationshipMomentum({
      ...baseInput,
      daysSinceLastInteraction: 5,
    });
    expect(result.decayApplied).toBe(true);
    expect(result.newAffection).toBeLessThan(baseInput.currentAffection);
    expect(result.newIntimacy).toBeLessThan(baseInput.currentIntimacy);
  });

  it("trust does NOT decay within grace period (<= 3 days)", () => {
    const result = computeRelationshipMomentum({
      ...baseInput,
      daysSinceLastInteraction: 3,
    });
    expect(result.decayApplied).toBe(true);
    // Trust should be unchanged since only 3 days (grace period is 3)
    expect(result.newTrust).toBe(baseInput.currentTrust);
  });

  it("trust decays after grace period (> 3 days)", () => {
    const result = computeRelationshipMomentum({
      ...baseInput,
      daysSinceLastInteraction: 7,
    });
    expect(result.newTrust).toBeLessThan(baseInput.currentTrust);
  });

  it("intimacy decays faster than trust", () => {
    const result = computeRelationshipMomentum({
      ...baseInput,
      daysSinceLastInteraction: 7,
    });
    const intimacyLoss = baseInput.currentIntimacy - result.newIntimacy;
    const trustLoss = baseInput.currentTrust - result.newTrust;
    expect(intimacyLoss).toBeGreaterThan(trustLoss);
  });

  // ── VIP tests ──────────────────────────────────────────────────────

  it("VIP users experience slower decay", () => {
    const freeResult = computeRelationshipMomentum({
      ...baseInput,
      daysSinceLastInteraction: 10,
      isVip: false,
    });
    const vipResult = computeRelationshipMomentum({
      ...baseInput,
      daysSinceLastInteraction: 10,
      isVip: true,
    });
    expect(vipResult.newAffection).toBeGreaterThan(freeResult.newAffection);
    expect(vipResult.newIntimacy).toBeGreaterThan(freeResult.newIntimacy);
  });

  // ── Growth tests ───────────────────────────────────────────────────

  it("grows relationship from active emotional interaction", () => {
    const result = computeRelationshipMomentum({
      ...baseInput,
      daysSinceLastInteraction: 0,
      emotionalIntensity: 0.9,
    });
    expect(result.newAffection).toBeGreaterThan(baseInput.currentAffection);
    expect(result.newIntimacy).toBeGreaterThan(baseInput.currentIntimacy);
  });

  it("does not grow when emotional intensity is zero", () => {
    const result = computeRelationshipMomentum({
      ...baseInput,
      daysSinceLastInteraction: 0,
      emotionalIntensity: 0,
    });
    expect(result.newAffection).toBe(baseInput.currentAffection);
  });

  // ── Trend tests ────────────────────────────────────────────────────

  it("reports rising trend when values increase", () => {
    const result = computeRelationshipMomentum({
      currentAffection: 50,
      currentTrust: 50,
      currentIntimacy: 50,
      daysSinceLastInteraction: 0,
      chatFrequency: 1.0,
      emotionalIntensity: 0.9,
      isVip: false,
      previousValues: { affection: 40, trust: 45, intimacy: 40 },
    });
    expect(result.trend).toBe("rising");
  });

  it("reports declining trend after long absence", () => {
    const result = computeRelationshipMomentum({
      currentAffection: 50,
      currentTrust: 50,
      currentIntimacy: 50,
      daysSinceLastInteraction: 14,
      chatFrequency: 0.2,
      emotionalIntensity: 0,
      isVip: false,
      previousValues: { affection: 55, trust: 55, intimacy: 55 },
    });
    expect(result.trend).toBe("declining");
  });

  it("reports stable trend when no previous values", () => {
    const result = computeRelationshipMomentum({
      ...baseInput,
      previousValues: undefined,
    });
    expect(result.trend).toBe("stable");
  });

  // ── Clamping ───────────────────────────────────────────────────────

  it("clamps values to 0-100 range", () => {
    const result = computeRelationshipMomentum({
      currentAffection: 5,
      currentTrust: 95,
      currentIntimacy: 98,
      daysSinceLastInteraction: 30,
      chatFrequency: 0,
      emotionalIntensity: 0,
      isVip: false,
    });
    expect(result.newAffection).toBeGreaterThanOrEqual(0);
    expect(result.newAffection).toBeLessThanOrEqual(5);
    expect(result.newTrust).toBeLessThanOrEqual(95);
    expect(result.newIntimacy).toBeLessThanOrEqual(98);
  });

  it("clamps growth to max 100", () => {
    const result = computeRelationshipMomentum({
      currentAffection: 98,
      currentTrust: 98,
      currentIntimacy: 98,
      daysSinceLastInteraction: 0,
      chatFrequency: 2,
      emotionalIntensity: 1.0,
      isVip: true,
    });
    expect(result.newAffection).toBeLessThanOrEqual(100);
    expect(result.newTrust).toBeLessThanOrEqual(100);
    expect(result.newIntimacy).toBeLessThanOrEqual(100);
  });

  // ── Low chat frequency amplifies decay ─────────────────────────────

  it("low chat frequency accelerates decay", () => {
    const highFreq = computeRelationshipMomentum({
      ...baseInput,
      daysSinceLastInteraction: 7,
      chatFrequency: 1.0,
    });
    const lowFreq = computeRelationshipMomentum({
      ...baseInput,
      daysSinceLastInteraction: 7,
      chatFrequency: 0.1,
    });
    expect(lowFreq.newAffection).toBeLessThan(highFreq.newAffection);
  });

  // ── Context summary ────────────────────────────────────────────────

  it("generates context summary for trend", () => {
    const rising = computeRelationshipMomentum({
      ...baseInput,
      daysSinceLastInteraction: 0,
      emotionalIntensity: 0.9,
      previousValues: { affection: 50, trust: 50, intimacy: 50 },
    });
    expect(rising.contextSummary).toContain("升温");

    const declining = computeRelationshipMomentum({
      ...baseInput,
      daysSinceLastInteraction: 14,
      previousValues: { affection: 70, trust: 70, intimacy: 70 },
    });
    expect(declining.contextSummary).toContain("渐行渐远");
  });

  // ── Momentum delta ─────────────────────────────────────────────────

  it("computes correct momentum deltas", () => {
    const result = computeRelationshipMomentum({
      ...baseInput,
      daysSinceLastInteraction: 5,
    });
    const delta = computeMomentumDelta(result, baseInput);
    expect(delta.affectionDelta).toBeLessThan(0);
    expect(delta.intimacyDelta).toBeLessThan(0);
  });
});
