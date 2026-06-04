
import { describe, it, expect, beforeEach, vi } from "vitest";
import { StoryEngine } from "../story.engine.js";
import { InMemoryStoryRepository } from "../story.repository.js";
import { createWorld } from "../story.world.js";
import { createNpc } from "../story.npc.js";
import { createStoryNode } from "../story.node.js";
import type { ProviderGateway } from "../../provider/index.js";
import type { ChatResponse } from "../../provider/provider.types.js";

/** Creates a ProviderGateway stub whose chat() returns a canned NPC response */
function createTestProviderGateway(responseText: string, providerId = "deepseek"): ProviderGateway {
  return {
    chat: vi.fn().mockResolvedValue({
      id: `${providerId}-test-${Date.now()}`,
      model: "deepseek-chat",
      content: responseText,
      finishReason: "stop",
      usage: { inputTokens: 10, outputTokens: 5, cacheHit: false },
      latencyMs: 100,
    } satisfies ChatResponse),
  } as unknown as ProviderGateway;
}

const TEST_USER_ID = "u1";
const TEST_IS_VIP = true;

describe("StoryEngine (via ProviderGateway)", () => {
  let repo: InMemoryStoryRepository;
  let worldId: string;
  let providerGateway: ProviderGateway;
  let engine: StoryEngine;

  beforeEach(async () => {
    repo = new InMemoryStoryRepository();
    providerGateway = createTestProviderGateway("I intervene now.");
    engine = new StoryEngine(repo, providerGateway, TEST_USER_ID, TEST_IS_VIP);

    const world = createWorld({
      creatorId: "u1",
      name: "Test Realm",
      tier: "basic",
      simple: {
        worldType: "fantasy",
        relationship: "allies",
        addressMode: "you",
        conflictMainline: "Defeat evil",
      },
      advanced: {
        rules: "No magic",
        hierarchy: "King > All",
        lore: "Ancient lore",
        atmosphere: "mysterious",
      },
    });
    worldId = world.id;
    await repo.saveWorld(world);

    const npc = createNpc({
      worldId: world.id,
      simple: { id: "n1", name: "Merlin", identity: "Wizard" },
      advanced: {
        triggerCondition: "magic,spell",
        storyInterventionLogic: "Appears on magic mention",
      },
    });
    await repo.saveNpc(npc);

    const node1 = createStoryNode({
      worldId: world.id,
      order: 0,
      title: "Chapter 1",
      description: "The beginning",
      triggerCondition: "",
      completionCondition: "crystal,found",
      dialogues: [],
    });
    await repo.saveStoryNode(node1);

    const node2 = createStoryNode({
      worldId: world.id,
      order: 1,
      title: "Chapter 2",
      description: "The middle",
      triggerCondition: "",
      completionCondition: "door,opened",
      dialogues: [],
    });
    await repo.saveStoryNode(node2);
  });

  it("throws for non-existent world", async () => {
    await expect(
      engine.processTurn({
        worldId: "nonexistent",
        conversationText: "hello",
        conversationHistory: "",
      }),
    ).rejects.toThrow("World not found");
  });

  it("returns world context for a normal turn (no NPC trigger)", async () => {
    const result = await engine.processTurn({
      worldId,
      conversationText: "Hello, world!",
      conversationHistory: "",
    });

    expect(result.worldContext.worldName).toBe("Test Realm");
    expect(result.worldPrompt.length).toBeGreaterThan(100);
    expect(result.worldPrompt).toContain("Test Realm");
    expect(result.worldPrompt).toContain("fantasy");
    expect(result.npcResponses).toHaveLength(0);
    expect(result.nodeProgress.changed).toBe(false);
  });

  it("triggers NPC via ProviderGateway when keyword matches", async () => {
    const result = await engine.processTurn({
      worldId,
      conversationText: "I cast a magic spell!",
      conversationHistory: "",
    });

    expect(result.npcResponses.length).toBeGreaterThan(0);
    expect(result.npcResponses[0].npcName).toBe("Merlin");
    expect(result.npcResponses[0].content).toBe("I intervene now.");
  });

  it("progresses story when node completion condition is met", async () => {
    const result = await engine.processTurn({
      worldId,
      conversationText: "I found the crystal!",
      conversationHistory: "",
    });

    expect(result.nodeProgress.changed).toBe(true);
    expect(result.nodeProgress.completedNodeIds.length).toBeGreaterThan(0);
    expect(result.nodeProgress.currentNodeId).toBeTruthy();
  });
});


