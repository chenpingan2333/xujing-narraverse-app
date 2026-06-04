import { describe, it, expect } from "vitest";
import {
  buildWorldSystemPrompt,
  buildNpcInterventionPrompt,
  buildNodeTransitionPrompt,
  buildWorldPrompt,
} from "../story.templates.js";
import type { WorldContext } from "../story.types.js";

const baseContext: WorldContext = {
  worldId: "w1",
  worldName: "Test World",
  worldType: "fantasy",
  rules: "No magic after midnight",
  hierarchy: "King > Knights > Peasants",
  lore: "An ancient dragon sleeps beneath the mountains",
  atmosphere: "mysterious",
  activeNpcs: [
    { id: "n1", name: "Merlin", identity: "Wizard" },
    { id: "n2", name: "Arthur", identity: "King" },
  ],
  currentNode: {
    id: "sn1",
    worldId: "w1",
    order: 1,
    title: "The Awakening",
    description: "The dragon stirs",
    status: "unlocked",
    triggerCondition: "enter_cave",
    completionCondition: "find_crystal",
    dialogues: [],
    rewards: [],
    createdAt: 1000,
  },
  allNodes: [],
  relationship: "allies",
  addressMode: "Your Majesty",
  conflictMainline: "Save the kingdom",
};

describe("buildWorldSystemPrompt", () => {
  it("produces a fixed-structure prompt with world name", () => {
    const prompt = buildWorldSystemPrompt(baseContext);
    expect(prompt).toContain("Test World");
    expect(prompt).toContain("fantasy");
    expect(prompt).toContain("No magic after midnight");
    expect(prompt).toContain("King > Knights > Peasants");
  });

  it("includes active NPCs by name", () => {
    const prompt = buildWorldSystemPrompt(baseContext);
    expect(prompt).toContain("Merlin");
    expect(prompt).toContain("Arthur");
  });

  it("includes current story node title", () => {
    const prompt = buildWorldSystemPrompt(baseContext);
    expect(prompt).toContain("The Awakening");
  });

  it("handles no current node gracefully with fallback text", () => {
    const ctx = { ...baseContext, currentNode: null };
    const prompt = buildWorldSystemPrompt(ctx);
    expect(prompt).toContain("free exploration");
  });

  it("maintains consistent header structure for cache", () => {
    const prompt1 = buildWorldSystemPrompt(baseContext);
    const prompt2 = buildWorldSystemPrompt({
      ...baseContext,
      worldName: "Different World",
    });
    const headers1 = prompt1.match(/\[.+\]/g) ?? [];
    const headers2 = prompt2.match(/\[.+\]/g) ?? [];
    expect(headers1).toEqual(headers2);
  });
});

describe("buildNpcInterventionPrompt", () => {
  it("builds intervention prompt for an NPC", () => {
    const prompt = buildNpcInterventionPrompt(
      { name: "Merlin", identity: "Wizard" },
      "player_enters_tower",
    );
    expect(prompt).toContain("Merlin");
    expect(prompt).toContain("Wizard");
    expect(prompt).toContain("player_enters_tower");
  });
});

describe("buildNodeTransitionPrompt", () => {
  it("builds transition prompt between nodes", () => {
    const prompt = buildNodeTransitionPrompt(
      { title: "Chapter 1" },
      { title: "Chapter 2", description: "The plot thickens" },
    );
    expect(prompt).toContain("Chapter 1");
    expect(prompt).toContain("Chapter 2");
    expect(prompt).toContain("The plot thickens");
  });
});

describe("buildWorldPrompt", () => {
  it("builds full world prompt with character and relationship context", () => {
    const result = buildWorldPrompt({
      world: baseContext,
      character: {
        id: "c1",
        userId: "u1",
        name: "Hero",
        persona: "Brave warrior",
        description: "A hero",
        config: {},
      },
      relationship: {
        userId: "u1",
        characterId: "c1",
        affection: 80,
        trust: 70,
        intimacy: 60,
        status: "active",
      },
      memoryContext: "They fought together at the Battle of Dawn.",
    });

    expect(result.systemPrompt).toContain("Test World");
    expect(result.worldPrompt).toContain("Hero");
    expect(result.worldPrompt).toContain("Brave warrior");
    expect(result.worldPrompt).toContain("80");
    expect(result.worldPrompt).toContain("Battle of Dawn");
  });
});
