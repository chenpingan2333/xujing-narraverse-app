import type { StoryRepository, WorldPackage, WorldPackageTier, WorldSimple, WorldAdvanced } from "./story.types.js";
import type { Npc, StoryNode, WorldContext, StoryEngineResult } from "./story.types.js";
import { createWorld, updateWorldSimple, updateWorldAdvanced, publishWorld, unpublishWorld, loadWorldWithContext, toPublicView } from "./story.world.js";
import { createNpc, updateNpcSimple, enableNpc, disableNpc } from "./story.npc.js";
import { createStoryNode } from "./story.node.js";
import type { ProviderGateway } from "../provider/index.js";
import { StoryEngine } from "./story.engine.js";

export class StoryService {
  private readonly engine: StoryEngine;

  constructor(
    private readonly repo: StoryRepository,
    private readonly providerGateway: ProviderGateway,
    private readonly userId: string,
    private readonly isVip: boolean,
  ) {
    this.engine = new StoryEngine(repo, providerGateway, userId, isVip);
  }

  async createWorld(input: {
    creatorId: string;
    name: string;
    tier: WorldPackageTier;
    simple: WorldSimple;
    advanced?: WorldAdvanced;
  }): Promise<WorldPackage> {
    const world = createWorld(input);
    await this.repo.saveWorld(world);
    return world;
  }

  async getWorld(worldId: string): Promise<WorldPackage | null> {
    return this.repo.getWorld(worldId);
  }

  async getPublicWorld(worldId: string): Promise<ReturnType<typeof toPublicView> | null> {
    const world = await this.repo.getWorld(worldId);
    if (!world || !world.published) return null;
    return toPublicView(world);
  }

  async listCreatorWorlds(creatorId: string): Promise<WorldPackage[]> {
    return this.repo.getWorldsByCreator(creatorId);
  }

  async updateWorldSimple(worldId: string, simple: Partial<WorldSimple>): Promise<WorldPackage | null> {
    const world = await this.repo.getWorld(worldId);
    if (!world) return null;
    const updated = updateWorldSimple(world, simple);
    await this.repo.saveWorld(updated);
    return updated;
  }

  async updateWorldAdvanced(worldId: string, advanced: WorldAdvanced): Promise<WorldPackage | null> {
    const world = await this.repo.getWorld(worldId);
    if (!world) return null;
    const updated = updateWorldAdvanced(world, advanced);
    await this.repo.saveWorld(updated);
    return updated;
  }

  async publish(worldId: string): Promise<WorldPackage | null> {
    const world = await this.repo.getWorld(worldId);
    if (!world) return null;
    const updated = publishWorld(world);
    await this.repo.saveWorld(updated);
    return updated;
  }

  async unpublish(worldId: string): Promise<WorldPackage | null> {
    const world = await this.repo.getWorld(worldId);
    if (!world) return null;
    const updated = unpublishWorld(world);
    await this.repo.saveWorld(updated);
    return updated;
  }

  async deleteWorld(worldId: string): Promise<void> {
    await this.repo.deleteWorld(worldId);
  }

  async addNpc(worldId: string, name: string, identity: string): Promise<Npc> {
    const npc = createNpc({ worldId, simple: { id: "", name, identity } });
    await this.repo.saveNpc(npc);
    return npc;
  }

  async updateNpcName(npcId: string, worldId: string, updates: { name?: string; identity?: string }): Promise<Npc | null> {
    const npcs = await this.repo.getNpcs(worldId);
    const npc = npcs.find((n) => n.id === npcId);
    if (!npc) return null;
    const updated = updateNpcSimple(npc, { id: npc.id, name: updates.name ?? npc.name, identity: updates.identity ?? npc.identity });
    await this.repo.saveNpc(updated);
    return updated;
  }

  async enableNpc(npcId: string, worldId: string): Promise<Npc | null> {
    const npcs = await this.repo.getNpcs(worldId);
    const npc = npcs.find((n) => n.id === npcId);
    if (!npc) return null;
    const updated = enableNpc(npc);
    await this.repo.saveNpc(updated);
    return updated;
  }

  async disableNpc(npcId: string, worldId: string): Promise<Npc | null> {
    const npcs = await this.repo.getNpcs(worldId);
    const npc = npcs.find((n) => n.id === npcId);
    if (!npc) return null;
    const updated = disableNpc(npc);
    await this.repo.saveNpc(updated);
    return updated;
  }

  async deleteNpc(npcId: string): Promise<void> {
    await this.repo.deleteNpc(npcId);
  }

  async addStoryNode(input: {
    worldId: string;
    order: number;
    title: string;
    description: string;
    triggerCondition: string;
    completionCondition: string;
    dialogues: Array<{ speaker: string; content: string }>;
    rewards?: string[];
  }): Promise<StoryNode> {
    const node = createStoryNode(input);
    await this.repo.saveStoryNode(node);
    return node;
  }

  async getStoryNodes(worldId: string): Promise<StoryNode[]> {
    return this.repo.getStoryNodes(worldId);
  }

  async processTurn(params: {
    worldId: string;
    conversationText: string;
    conversationHistory: string;
    characterTier?: string;
    worldTier?: string;
  }): Promise<StoryEngineResult> {
    return this.engine.processTurn(params);
  }

  async getWorldContext(worldId: string): Promise<WorldContext | null> {
    const loaded = await loadWorldWithContext(this.repo, worldId);
    return loaded?.context ?? null;
  }
}
