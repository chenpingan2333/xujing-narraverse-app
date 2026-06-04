import { randomUUID } from "node:crypto";
import type { StoryRepository, WorldPackage, WorldPackageTier, WorldSimple, WorldAdvanced, WorldContext } from "./story.types.js";
import { toPublicView } from "./story.pricing.js";
import type { Npc, StoryNode } from "./story.types.js";

interface CreateWorldInput {
  creatorId: string;
  name: string;
  tier: WorldPackageTier;
  simple: WorldSimple;
  advanced?: WorldAdvanced;
}

interface WorldWithContext {
  world: WorldPackage;
  npcs: Npc[];
  nodes: StoryNode[];
  context: WorldContext;
}

export function createWorld(input: CreateWorldInput): WorldPackage {
  const now = Date.now();
  return {
    id: randomUUID(),
    creatorId: input.creatorId,
    name: input.name,
    tier: input.tier,
    simple: input.simple,
    advanced: input.advanced,
    characterIds: [],
    npcIds: [],
    storyNodeIds: [],
    published: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateWorldSimple(
  world: WorldPackage,
  simple: Partial<WorldSimple>,
): WorldPackage {
  return {
    ...world,
    simple: { ...world.simple, ...simple },
    updatedAt: Date.now(),
  };
}

export function updateWorldAdvanced(
  world: WorldPackage,
  advanced: WorldAdvanced,
): WorldPackage {
  return {
    ...world,
    advanced,
    updatedAt: Date.now(),
  };
}

export function publishWorld(world: WorldPackage): WorldPackage {
  return { ...world, published: true, updatedAt: Date.now() };
}

export function unpublishWorld(world: WorldPackage): WorldPackage {
  return { ...world, published: false, updatedAt: Date.now() };
}

/**
 * Build a WorldContext from a fully loaded world + its NPCs and story nodes.
 * Used by the chat pipeline to inject world state.
 */
export function buildWorldContext(world: WorldPackage, npcs: Npc[], nodes: StoryNode[]): WorldContext {
  const activeNpcs = npcs
    .filter((n) => n.enabled)
    .map((n) => ({ id: n.id, name: n.name, identity: n.identity }));

  const currentNode = nodes
    .filter((n) => n.status === "unlocked")
    .sort((a, b) => a.order - b.order)[0] ?? null;

  const adv = world.advanced;

  return {
    worldId: world.id,
    worldName: world.name,
    worldType: world.simple.worldType,
    rules: adv?.rules ?? "",
    hierarchy: adv?.hierarchy ?? "",
    lore: adv?.lore ?? "",
    atmosphere: adv?.atmosphere ?? "",
    activeNpcs,
    currentNode,
    allNodes: nodes,
    relationship: world.simple.relationship,
    addressMode: world.simple.addressMode,
    conflictMainline: world.simple.conflictMainline,
  };
}

/**
 * Load a world with all related data and build its context.
 */
export async function loadWorldWithContext(
  repo: StoryRepository,
  worldId: string,
): Promise<WorldWithContext | null> {
  const world = await repo.getWorld(worldId);
  if (!world) return null;

  const [npcs, nodes] = await Promise.all([
    repo.getNpcs(worldId),
    repo.getStoryNodes(worldId),
  ]);

  const context = buildWorldContext(world, npcs, nodes);

  return { world, npcs, nodes, context };
}

export { toPublicView };
