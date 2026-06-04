import { describe, it, expect } from "vitest";
import {
  createStoryNode,
  checkNodeCompletion,
  progressStory,
  isStoryComplete,
  getCurrentNode,
} from "../story.node.js";
import type { StoryNode } from "../story.types.js";

function makeNode(overrides: Partial<StoryNode> = {}): StoryNode {
  return {
    id: "sn1",
    worldId: "w1",
    order: 0,
    title: "Start",
    description: "The beginning",
    status: "unlocked",
    triggerCondition: "",
    completionCondition: "key,final",
    dialogues: [],
    rewards: [],
    createdAt: 1000,
    ...overrides,
  };
}

describe("createStoryNode", () => {
  it("creates a story node", () => {
    const node = createStoryNode({
      worldId: "w1",
      order: 0,
      title: "The Beginning",
      description: "Start of the journey",
      triggerCondition: "",
      completionCondition: "reach_town",
      dialogues: [{ speaker: "narrator", content: "Welcome" }],
      rewards: ["gold_100"],
    });
    expect(node.id).toBeTruthy();
    expect(node.status).toBe("unlocked");
    expect(node.rewards).toEqual(["gold_100"]);
  });

  it("locks nodes with order > 0", () => {
    const node = createStoryNode({
      worldId: "w1",
      order: 5,
      title: "Later",
      description: "Later chapter",
      triggerCondition: "",
      completionCondition: "",
      dialogues: [],
    });
    expect(node.status).toBe("locked");
  });
});

describe("checkNodeCompletion", () => {
  it("returns true when all completion keywords are present", () => {
    const node = makeNode({ completionCondition: "key,final" });
    const result = checkNodeCompletion(node, "I found the key and reached the final door");
    expect(result).toBe(true);
  });

  it("returns false when some keywords are missing", () => {
    const node = makeNode({ completionCondition: "key,final" });
    const result = checkNodeCompletion(node, "I found the key");
    expect(result).toBe(false);
  });

  it("returns false for non-unlocked nodes", () => {
    const node = makeNode({ status: "locked", completionCondition: "key" });
    const result = checkNodeCompletion(node, "key");
    expect(result).toBe(false);
  });

  it("returns false for completed nodes", () => {
    const node = makeNode({ status: "completed", completionCondition: "key" });
    const result = checkNodeCompletion(node, "key");
    expect(result).toBe(false);
  });
});

describe("progressStory", () => {
  it("completes current node and unlocks next", () => {
    const nodes = [
      makeNode({ id: "sn1", order: 0, status: "unlocked" }),
      makeNode({ id: "sn2", order: 1, status: "locked" }),
    ];

    const changed = progressStory(nodes, nodes[0]);
    expect(changed).toHaveLength(2);

    const sn1 = changed.find((n) => n.id === "sn1");
    const sn2 = changed.find((n) => n.id === "sn2");
    expect(sn1?.status).toBe("completed");
    expect(sn2?.status).toBe("unlocked");
  });

  it("does nothing if no next node exists", () => {
    const nodes = [makeNode({ id: "sn1", order: 5, status: "unlocked" })];
    const changed = progressStory(nodes, nodes[0]);
    expect(changed).toHaveLength(1);
    expect(changed[0].status).toBe("completed");
  });
});

describe("isStoryComplete", () => {
  it("returns true when all nodes are completed", () => {
    const nodes = [
      makeNode({ id: "sn1", order: 0, status: "completed" }),
      makeNode({ id: "sn2", order: 1, status: "completed" }),
    ];
    expect(isStoryComplete(nodes)).toBe(true);
  });

  it("returns false when some nodes are not completed", () => {
    const nodes = [
      makeNode({ id: "sn1", order: 0, status: "completed" }),
      makeNode({ id: "sn2", order: 1, status: "unlocked" }),
    ];
    expect(isStoryComplete(nodes)).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(isStoryComplete([])).toBe(false);
  });
});

describe("getCurrentNode", () => {
  it("returns the first unlocked node by order", () => {
    const nodes = [
      makeNode({ id: "sn2", order: 1, status: "unlocked" }),
      makeNode({ id: "sn1", order: 0, status: "completed" }),
      makeNode({ id: "sn3", order: 2, status: "locked" }),
    ];
    const current = getCurrentNode(nodes);
    expect(current?.id).toBe("sn2");
  });

  it("returns null when no nodes are unlocked", () => {
    const nodes = [makeNode({ id: "sn1", order: 0, status: "locked" })];
    const current = getCurrentNode(nodes);
    expect(current).toBeNull();
  });
});
