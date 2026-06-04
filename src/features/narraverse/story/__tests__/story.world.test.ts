import { describe, it, expect } from "vitest";
import { createWorld, updateWorldSimple, updateWorldAdvanced, publishWorld, unpublishWorld, buildWorldContext } from "../story.world.js";
import type { Npc, StoryNode } from "../story.types.js";

const simpleInput = {
  creatorId: "u1",
  name: "Fantasy Realm",
  tier: "basic" as const,
  simple: {
    worldType: "fantasy" as const,
    relationship: "allies",
    addressMode: "你",
    conflictMainline: "Defeat the dark lord",
  },
};

describe("createWorld", () => {
  it("creates a world with required fields", () => {
    const world = createWorld(simpleInput);
    expect(world.id).toBeTruthy();
    expect(world.creatorId).toBe("u1");
    expect(world.name).toBe("Fantasy Realm");
    expect(world.tier).toBe("basic");
    expect(world.simple.worldType).toBe("fantasy");
    expect(world.published).toBe(false);
    expect(world.characterIds).toEqual([]);
  });

  it("creates a world with advanced settings", () => {
    const world = createWorld({
      ...simpleInput,
      advanced: {
        rules: "No magic on Sundays",
        hierarchy: "King > Knights",
        lore: "Ancient prophecy",
        atmosphere: "epic",
      },
    });
    expect(world.advanced?.rules).toBe("No magic on Sundays");
    expect(world.advanced?.atmosphere).toBe("epic");
  });
});

describe("updateWorldSimple", () => {
  it("updates simple fields", () => {
    const world = createWorld(simpleInput);
    const updated = updateWorldSimple(world, {
      addressMode: "您",
      conflictMainline: "New conflict",
    });
    expect(updated.simple.addressMode).toBe("您");
    expect(updated.simple.conflictMainline).toBe("New conflict");
    expect(updated.simple.worldType).toBe("fantasy"); // unchanged
  });
});

describe("updateWorldAdvanced", () => {
  it("sets advanced fields", () => {
    const world = createWorld(simpleInput);
    const updated = updateWorldAdvanced(world, {
      rules: "Rule 1",
      hierarchy: "H1",
      lore: "Lore",
      atmosphere: "dark",
    });
    expect(updated.advanced?.rules).toBe("Rule 1");
    expect(updated.advanced?.hierarchy).toBe("H1");
  });
});

describe("publishWorld / unpublishWorld", () => {
  it("publishes and unpublishes a world", () => {
    const world = createWorld(simpleInput);
    expect(world.published).toBe(false);

    const published = publishWorld(world);
    expect(published.published).toBe(true);

    const unpublished = unpublishWorld(published);
    expect(unpublished.published).toBe(false);
  });
});

describe("buildWorldContext", () => {
  it("builds context from world, npcs, and nodes", () => {
    const world = createWorld({
      ...simpleInput,
      advanced: {
        rules: "No magic",
        hierarchy: "King > All",
        lore: "Ancient lore",
        atmosphere: "mysterious",
      },
    });

    const npcs: Npc[] = [
      { id: "n1", worldId: world.id, name: "Merlin", identity: "Wizard", enabled: true, createdAt: 1000, updatedAt: 1000 },
      { id: "n2", worldId: world.id, name: "Guard", identity: "Soldier", enabled: false, createdAt: 1000, updatedAt: 1000 },
    ];

    const nodes: StoryNode[] = [
      { id: "sn1", worldId: world.id, order: 0, title: "Start", description: "Beginning", status: "unlocked", triggerCondition: "", completionCondition: "", dialogues: [], rewards: [], createdAt: 1000 },
      { id: "sn2", worldId: world.id, order: 1, title: "Middle", description: "Middle part", status: "locked", triggerCondition: "", completionCondition: "", dialogues: [], rewards: [], createdAt: 1000 },
    ];

    const ctx = buildWorldContext(world, npcs, nodes);

    expect(ctx.worldId).toBe(world.id);
    expect(ctx.activeNpcs).toHaveLength(1);
    expect(ctx.activeNpcs[0].name).toBe("Merlin");
    expect(ctx.currentNode?.title).toBe("Start");
    expect(ctx.rules).toBe("No magic");
    expect(ctx.atmosphere).toBe("mysterious");
  });

  it("returns null currentNode when no node is unlocked", () => {
    const world = createWorld(simpleInput);
    const nodes: StoryNode[] = [
      { id: "sn1", worldId: world.id, order: 0, title: "Start", description: "Beginning", status: "locked", triggerCondition: "", completionCondition: "", dialogues: [], rewards: [], createdAt: 1000 },
    ];
    const ctx = buildWorldContext(world, [], nodes);
    expect(ctx.currentNode).toBeNull();
  });
});

