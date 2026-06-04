import { randomUUID } from "node:crypto";
import type { Npc, NpcSimple, NpcAdvanced } from "./story.types.js";

interface CreateNpcInput {
  worldId: string;
  simple: NpcSimple;
  advanced?: NpcAdvanced;
}

export function createNpc(input: CreateNpcInput): Npc {
  const now = Date.now();
  return {
    id: randomUUID(),
    worldId: input.worldId,
    name: input.simple.name,
    identity: input.simple.identity,
    enabled: true,
    advanced: input.advanced,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateNpcSimple(npc: Npc, simple: Partial<NpcSimple>): Npc {
  return {
    ...npc,
    name: simple.name ?? npc.name,
    identity: simple.identity ?? npc.identity,
    updatedAt: Date.now(),
  };
}

export function updateNpcAdvanced(
  npc: Npc,
  advanced: NpcAdvanced,
): Npc {
  return { ...npc, advanced, updatedAt: Date.now() };
}

export function enableNpc(npc: Npc): Npc {
  return { ...npc, enabled: true, updatedAt: Date.now() };
}

export function disableNpc(npc: Npc): Npc {
  return { ...npc, enabled: false, updatedAt: Date.now() };
}

/**
 * Check if an NPC should intervene based on the conversation context.
 * Returns the NPC if triggered, null otherwise.
 */
export function checkNpcTrigger(
  npc: Npc,
  conversationText: string,
): Npc | null {
  if (!npc.enabled || !npc.advanced) return null;

  const { triggerCondition } = npc.advanced;
  if (!triggerCondition) return null;

  // Keyword-based trigger matching
  const keywords = triggerCondition
    .split(/[,，、\s]+/)
    .filter((k) => k.length > 0);

  const triggered = keywords.some((kw) => conversationText.includes(kw));
  return triggered ? npc : null;
}

/**
 * Check all NPCs in a world for triggers and return those that should intervene.
 */
export function getTriggeredNpcs(
  npcs: Npc[],
  conversationText: string,
): Npc[] {
  return npcs
    .map((n) => checkNpcTrigger(n, conversationText))
    .filter((n): n is Npc => n !== null);
}
