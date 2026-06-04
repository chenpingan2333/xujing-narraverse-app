import { describe, it, expect } from "vitest";
import {
  createNpc,
  updateNpcSimple,
  updateNpcAdvanced,
  enableNpc,
  disableNpc,
  checkNpcTrigger,
  getTriggeredNpcs,
} from "../story.npc.js";
import type { Npc } from "../story.types.js";

function makeNpc(overrides: Partial<Npc> = {}): Npc {
  return {
    id: "n1",
    worldId: "w1",
    name: "Merlin",
    identity: "Wizard",
    enabled: true,
    advanced: {
      triggerCondition: "magic,spell,crystal",
      storyInterventionLogic: "Appears when magic is mentioned",
    },
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

describe("createNpc", () => {
  it("creates an NPC with simple fields", () => {
    const npc = createNpc({
      worldId: "w1",
      simple: { id: "n1", name: "Merlin", identity: "Wizard" },
    });
    expect(npc.id).toBeTruthy();
    expect(npc.name).toBe("Merlin");
    expect(npc.identity).toBe("Wizard");
    expect(npc.enabled).toBe(true);
  });

  it("creates an NPC with advanced fields", () => {
    const npc = createNpc({
      worldId: "w1",
      simple: { id: "n1", name: "Guard", identity: "Soldier" },
      advanced: {
        triggerCondition: "attack,defend",
        storyInterventionLogic: "Intervenes during combat",
      },
    });
    expect(npc.advanced?.triggerCondition).toBe("attack,defend");
  });
});

describe("updateNpcSimple", () => {
  it("updates simple fields", () => {
    const npc = makeNpc();
    const updated = updateNpcSimple(npc, { id: npc.id, name: "Gandalf" });
    expect(updated.name).toBe("Gandalf");
    expect(updated.identity).toBe("Wizard"); // unchanged
  });
});

describe("updateNpcAdvanced", () => {
  it("updates advanced fields", () => {
    const npc = makeNpc();
    const updated = updateNpcAdvanced(npc, {
      triggerCondition: "fire,water",
      storyInterventionLogic: "New logic",
    });
    expect(updated.advanced?.triggerCondition).toBe("fire,water");
    expect(updated.advanced?.storyInterventionLogic).toBe("New logic");
  });
});

describe("enableNpc / disableNpc", () => {
  it("disables and enables NPC", () => {
    const npc = makeNpc();
    const disabled = disableNpc(npc);
    expect(disabled.enabled).toBe(false);

    const enabled = enableNpc(disabled);
    expect(enabled.enabled).toBe(true);
  });
});

describe("checkNpcTrigger", () => {
  it("triggers NPC when keyword matches", () => {
    const npc = makeNpc();
    const result = checkNpcTrigger(npc, "I found a magic crystal");
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Merlin");
  });

  it("does not trigger when no keyword matches", () => {
    const npc = makeNpc();
    const result = checkNpcTrigger(npc, "Hello, how are you?");
    expect(result).toBeNull();
  });

  it("does not trigger when NPC is disabled", () => {
    const npc = makeNpc({ enabled: false });
    const result = checkNpcTrigger(npc, "magic");
    expect(result).toBeNull();
  });

  it("does not trigger when NPC has no advanced config", () => {
    const npc = makeNpc({ advanced: undefined });
    const result = checkNpcTrigger(npc, "magic");
    expect(result).toBeNull();
  });
});

describe("getTriggeredNpcs", () => {
  it("returns all triggered NPCs from a list", () => {
    const npcs = [
      makeNpc({ id: "n1", name: "Merlin" }),
      makeNpc({ id: "n2", name: "Guard", advanced: undefined }),
      makeNpc({
        id: "n3",
        name: "Oracle",
        advanced: {
          triggerCondition: "prophecy,destiny",
          storyInterventionLogic: "",
        },
      }),
    ];

    const triggered = getTriggeredNpcs(npcs, "The prophecy spoke of magic");
    expect(triggered).toHaveLength(2);
    expect(triggered.map((n) => n.name)).toContain("Merlin");
    expect(triggered.map((n) => n.name)).toContain("Oracle");
  });

  it("returns empty array when no NPCs are triggered", () => {
    const npcs = [makeNpc()];
    const triggered = getTriggeredNpcs(npcs, "Good morning");
    expect(triggered).toEqual([]);
  });
});
