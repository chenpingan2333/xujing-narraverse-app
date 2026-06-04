/* eslint-disable @typescript-eslint/require-await */

import { describe, it, expect, beforeEach } from "vitest";
import { executeLoadContext } from "../chat.pipeline.js";
import type {
  CharacterService,
  RelationshipService,
  CharacterData,
  RelationshipData,
} from "../chat.types.js";
import { InMemoryStore } from "../../memory/memory-store.testdoubles.js";
import { InMemoryChatRepository } from "../chat.repository.js";

function makeCharacter(overrides: Partial<CharacterData> = {}): CharacterData {
  return {
    id: "c1",
    userId: "u1",
    name: "Test",
    persona: "Persona text",
    description: "Description text",
    config: {},
    ...overrides,
  };
}

function makeRelationship(overrides: Partial<RelationshipData> = {}): RelationshipData {
  return {
    userId: "u1",
    characterId: "c1",
    affection: 50,
    trust: 50,
    intimacy: 50,
    status: "active",
    ...overrides,
  };
}

describe("executeLoadContext", () => {
  let characterService: CharacterService;
  let relationshipService: RelationshipService;
  let memoryStore: InMemoryStore;
  let chatRepository: InMemoryChatRepository;

  beforeEach(() => {
    memoryStore = new InMemoryStore();
    chatRepository = new InMemoryChatRepository();
    characterService = {
      getCharacter: async () => makeCharacter(),
    };
    relationshipService = {
      getRelationship: async () => makeRelationship(),
      updateRelationship: async () => makeRelationship(),
    };
  });

  it("builds runtime context with character data", async () => {
    const ctx = await executeLoadContext({
      characterService,
      relationshipService,
      memoryStore,
      chatRepository,
      userId: "u1",
      characterId: "c1",
      sessionId: "s1",
    });
    expect(ctx.character.id).toBe("c1");
    expect(ctx.character.name).toBe("Test");
    expect(ctx.character.persona).toBe("Persona text");
  });

  it("includes relationship data in context", async () => {
    const ctx = await executeLoadContext({
      characterService,
      relationshipService,
      memoryStore,
      chatRepository,
      userId: "u1",
      characterId: "c1",
      sessionId: "s1",
    });
    expect(ctx.relationship.affection).toBe(50);
    expect(ctx.relationship.trust).toBe(50);
    expect(ctx.relationship.intimacy).toBe(50);
  });

  it("includes sessionId in context", async () => {
    const ctx = await executeLoadContext({
      characterService,
      relationshipService,
      memoryStore,
      chatRepository,
      userId: "u1",
      characterId: "c1",
      sessionId: "session-abc",
    });
    expect(ctx.sessionId).toBe("session-abc");
  });

  it("includes session messages from repository", async () => {
    await chatRepository.saveMessage({
      id: "m1",
      sessionId: "s1",
      userId: "u1",
      characterId: "c1",
      role: "user",
      content: "Hello",
      createdAt: Date.now(),
    });

    const ctx = await executeLoadContext({
      characterService,
      relationshipService,
      memoryStore,
      chatRepository,
      userId: "u1",
      characterId: "c1",
      sessionId: "s1",
    });
    expect(ctx.sessionMessages).toHaveLength(1);
    expect(ctx.sessionMessages[0].content).toBe("Hello");
  });

  it("includes memoryContext string", async () => {
    const ctx = await executeLoadContext({
      characterService,
      relationshipService,
      memoryStore,
      chatRepository,
      userId: "u1",
      characterId: "c1",
      sessionId: "s1",
    });
    expect(ctx.memoryContext.length).toBeGreaterThan(0);
  });
});

