import type { CustomCharacter, CreateCharacterInput, UpdateCharacterInput, CustomCharacterResponse } from "./types.js";
import { toCharacterResponse } from "./types.js";
import type { PersonaBuilderInput } from "../persona/persona.types.js";

/**
 * CustomCharacterService — manages user-created characters with user isolation.
 *
 * - Characters are scoped per userId (enforced at API layer).
 * - Integrates with persona.builder for system prompt consistency.
 * - In-memory MVP; replace with PostgreSQL for production.
 */
const characters = new Map<string, CustomCharacter>();

let idCounter = 0;
function nextId(): string {
  return `cchar-${Date.now()}-${++idCounter}`;
}

export class CustomCharacterService {
  /** List all characters for a user */
  list(userId: string): CustomCharacterResponse[] {
    const results: CustomCharacterResponse[] = [];
    for (const c of characters.values()) {
      if (c.userId === userId) {
        results.push(toCharacterResponse(c));
      }
    }
    return results;
  }

  /** Get a single character, scoped to user */
  get(userId: string, characterId: string): CustomCharacter | null {
    const c = characters.get(characterId);
    if (!c || c.userId !== userId) return null;
    return c;
  }

  /** Create a new character */
  create(userId: string, input: CreateCharacterInput): CustomCharacterResponse {
    const now = Date.now();
    const character: CustomCharacter = {
      id: nextId(),
      userId,
      name: input.name,
      persona: input.persona,
      description: input.description ?? "",
      tier: input.tier ?? "basic",
      avatar: input.avatar ?? "✨",
      worldId: input.worldId ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    characters.set(character.id, character);
    return toCharacterResponse(character);
  }

  /** Update an existing character */
  update(userId: string, characterId: string, input: UpdateCharacterInput): CustomCharacterResponse | null {
    const existing = characters.get(characterId);
    if (!existing || existing.userId !== userId) return null;

    const updated: CustomCharacter = {
      ...existing,
      name: input.name ?? existing.name,
      persona: input.persona ?? existing.persona,
      description: input.description !== undefined ? input.description : existing.description,
      tier: input.tier ?? existing.tier,
      avatar: input.avatar ?? existing.avatar,
      worldId: input.worldId !== undefined ? input.worldId : existing.worldId,
      isActive: input.isActive ?? existing.isActive,
      updatedAt: Date.now(),
    };
    characters.set(characterId, updated);
    return toCharacterResponse(updated);
  }

  /** Delete a character */
  delete(userId: string, characterId: string): boolean {
    const existing = characters.get(characterId);
    if (!existing || existing.userId !== userId) return false;
    characters.delete(characterId);
    return true;
  }

  /** Convert a CustomCharacter to PersonaBuilderInput for persona integration */
  toPersonaInput(character: CustomCharacter): PersonaBuilderInput {
    return {
      name: character.name,
      persona: character.persona,
      tier: character.tier,
      relationshipAffection: 50,
      relationshipTrust: 50,
      relationshipIntimacy: 50,
    };
  }

  /** Check if a character belongs to a user */
  ownsCharacter(userId: string, characterId: string): boolean {
    const c = characters.get(characterId);
    return c?.userId === userId;
  }

  /** Reset (for testing) */
  reset(): void {
    characters.clear();
    idCounter = 0;
  }
}

export const customCharacterService = new CustomCharacterService();
