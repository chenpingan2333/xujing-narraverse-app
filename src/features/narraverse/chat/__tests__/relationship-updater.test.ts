 

import { describe, it, expect } from "vitest";
import {
  detectRelationshipEvents,
  computeRelationshipDelta,
} from "../relationship-updater.js";

describe("detectRelationshipEvents", () => {
  it("detects gift events", () => {
    const events = detectRelationshipEvents("This is a gift for you", "Thank you");
    expect(events.some((e) => e.type === "gift")).toBe(true);
  });

  it("detects compliment events", () => {
    const events = detectRelationshipEvents("You are amazing", "Thanks");
    expect(events.some((e) => e.type === "compliment")).toBe(true);
  });

  it("detects care events", () => {
    const events = detectRelationshipEvents("Are you ok? Take care of yourself", "I am fine");
    expect(events.some((e) => e.type === "care")).toBe(true);
  });

  it("detects companionship events", () => {
    const events = detectRelationshipEvents("Let's go watch a movie together", "Sure");
    expect(events.some((e) => e.type === "companionship")).toBe(true);
  });

  it("detects promise_kept events", () => {
    const events = detectRelationshipEvents("I kept my promise", "Thank you");
    expect(events.some((e) => e.type === "promise_kept")).toBe(true);
  });

  it("detects argument events", () => {
    const events = detectRelationshipEvents("Stop arguing with me", "I am annoyed");
    expect(events.some((e) => e.type === "argument")).toBe(true);
  });

  it("detects coldness events", () => {
    const events = detectRelationshipEvents("Don't ignore me", "");
    expect(events.some((e) => e.type === "coldness")).toBe(true);
  });

  it("detects promise_broken events", () => {
    const events = detectRelationshipEvents("You broke your promise again", "I forgot");
    expect(events.some((e) => e.type === "promise_broken")).toBe(true);
  });

  it("returns empty array for neutral conversation", () => {
    const events = detectRelationshipEvents("The weather is nice today", "Yes it is");
    expect(events).toEqual([]);
  });
});

describe("computeRelationshipDelta", () => {
  it("returns zero delta for no events", () => {
    const delta = computeRelationshipDelta([]);
    expect(delta.affection).toBe(0);
    expect(delta.trust).toBe(0);
    expect(delta.intimacy).toBe(0);
  });

  it("computes positive deltas for positive events", () => {
    const delta = computeRelationshipDelta([
      { type: "compliment", intensity: 1, description: "compliment" },
      { type: "care", intensity: 1, description: "care" },
    ]);
    expect(delta.affection).toBeGreaterThan(0);
    expect(delta.trust).toBeGreaterThan(0);
    expect(delta.intimacy).toBeGreaterThan(0);
    expect(delta.reason).toContain("compliment");
    expect(delta.reason).toContain("care");
  });

  it("computes negative deltas for negative events", () => {
    const delta = computeRelationshipDelta([
      { type: "argument", intensity: 1, description: "argument" },
    ]);
    expect(delta.affection).toBeLessThan(0);
    expect(delta.trust).toBeLessThan(0);
    expect(delta.intimacy).toBeLessThan(0);
  });

  it("scales deltas by intensity", () => {
    const fullIntensity = computeRelationshipDelta([
      { type: "gift", intensity: 1, description: "gift" },
    ]);
    const halfIntensity = computeRelationshipDelta([
      { type: "gift", intensity: 0.5, description: "gift" },
    ]);
    expect(fullIntensity.affection).toBeGreaterThan(halfIntensity.affection);
  });
});
