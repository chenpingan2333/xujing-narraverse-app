import { describe, it, expect, beforeEach } from "vitest";
import { customCharacterService } from "../service.js";
import {
  CreateCharacterRequest,
  UpdateCharacterRequest,
  toCharacterResponse,
} from "../types.js";

// Helper: minimal character create params
const mkChar = (name: string, persona: string) => ({
  name, persona, description: "", tier: "basic" as const, avatar: "✨", worldId: null as string | null,
});

describe("CustomCharacterService", () => {
  beforeEach(() => {
    customCharacterService.reset();
  });

  it("creates a character for a user", () => {
    const c = customCharacterService.create("user-1", {
      name: "My Character",
      persona: "A mysterious wanderer",
      description: "Test",
      tier: "basic",
      avatar: "✨",
      worldId: null,
    });
    expect(c.id).toBeTruthy();
    expect(c.name).toBe("My Character");
    expect(c.persona).toBe("A mysterious wanderer");
    expect(c.tier).toBe("basic");
    expect(c.isActive).toBe(true);
  });

  it("lists characters for a specific user only", () => {
    customCharacterService.create("user-1", mkChar("C1", "P1"));
    customCharacterService.create("user-1", mkChar("C2", "P2"));
    customCharacterService.create("user-2", mkChar("C3", "P3"));

    const list1 = customCharacterService.list("user-1");
    expect(list1).toHaveLength(2);

    const list2 = customCharacterService.list("user-2");
    expect(list2).toHaveLength(1);
    expect(list2[0].name).toBe("C3");
  });

  it("returns null when getting another user's character", () => {
    const c = customCharacterService.create("user-1", mkChar("Secret", "Hidden"));
    const found = customCharacterService.get("user-2", c.id);
    expect(found).toBeNull();
  });

  it("gets own character successfully", () => {
    const created = customCharacterService.create("user-1", mkChar("Mine", "My persona"));
    const found = customCharacterService.get("user-1", created.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Mine");
  });

  it("updates own character", () => {
    const c = customCharacterService.create("user-1", mkChar("Old", "Old persona"));
    const updated = customCharacterService.update("user-1", c.id, { name: "New" });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("New");
    expect(updated!.persona).toBe("Old persona");
  });

  it("cannot update another user's character", () => {
    const c = customCharacterService.create("user-1", mkChar("Target", "T"));
    const result = customCharacterService.update("user-2", c.id, { name: "Hacked" });
    expect(result).toBeNull();
  });

  it("deletes own character", () => {
    const c = customCharacterService.create("user-1", mkChar("DeleteMe", "X"));
    expect(customCharacterService.delete("user-1", c.id)).toBe(true);
    expect(customCharacterService.get("user-1", c.id)).toBeNull();
  });

  it("cannot delete another user's character", () => {
    const c = customCharacterService.create("user-1", mkChar("Keep", "K"));
    expect(customCharacterService.delete("user-2", c.id)).toBe(false);
    expect(customCharacterService.get("user-1", c.id)).not.toBeNull();
  });

  it("ownsCharacter checks correctly", () => {
    const c = customCharacterService.create("user-1", mkChar("Owner", "O"));
    expect(customCharacterService.ownsCharacter("user-1", c.id)).toBe(true);
    expect(customCharacterService.ownsCharacter("user-2", c.id)).toBe(false);
  });

  it("converts to PersonaBuilderInput", () => {
    const c = customCharacterService.create("user-1", {
      name: "PersonaTest",
      persona: "A gentle soul who loves tea",
      description: "",
      tier: "premium",
      avatar: "☕",
      worldId: null,
    });
    const full = customCharacterService.get("user-1", c.id)!;
    const input = customCharacterService.toPersonaInput(full);
    expect(input.name).toBe("PersonaTest");
    expect(input.persona).toBe("A gentle soul who loves tea");
    expect(input.tier).toBe("premium");
  });
});

describe("Zod Schemas", () => {
  it("CreateCharacterRequest validates correct input", () => {
    const result = CreateCharacterRequest.safeParse({
      name: "Test",
      persona: "A test character",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tier).toBe("basic");
      expect(result.data.avatar).toBe("✨");
    }
  });

  it("CreateCharacterRequest rejects empty name", () => {
    const result = CreateCharacterRequest.safeParse({ name: "", persona: "Test" });
    expect(result.success).toBe(false);
  });

  it("CreateCharacterRequest rejects name over 40 chars", () => {
    const result = CreateCharacterRequest.safeParse({
      name: "A".repeat(41),
      persona: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("CreateCharacterRequest rejects persona over 1000 chars", () => {
    const result = CreateCharacterRequest.safeParse({
      name: "Test",
      persona: "A".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("UpdateCharacterRequest allows partial updates", () => {
    const result = UpdateCharacterRequest.safeParse({ name: "NewName" });
    expect(result.success).toBe(true);
  });

  it("UpdateCharacterRequest rejects invalid tier", () => {
    const result = UpdateCharacterRequest.safeParse({ tier: "legendary" });
    expect(result.success).toBe(false);
  });
});

describe("toCharacterResponse", () => {
  it("strips userId from response", () => {
    const resp = toCharacterResponse({
      id: "c-1",
      userId: "should-be-removed",
      name: "Safe",
      persona: "Safe persona",
      description: "",
      tier: "basic",
      avatar: "✨",
      worldId: null,
      isActive: true,
      createdAt: 1000,
      updatedAt: 2000,
    });
    expect(resp).not.toHaveProperty("userId");
    expect(resp.name).toBe("Safe");
  });
});
