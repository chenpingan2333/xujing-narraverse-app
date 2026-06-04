/* eslint-disable @typescript-eslint/require-await */

import type { StoryRepository, WorldPackage, Npc, StoryNode, StoryNodeStatus } from "./story.types.js";

export class InMemoryStoryRepository implements StoryRepository {
  private worlds = new Map<string, WorldPackage>();
  private npcs = new Map<string, Npc>();
  private nodes = new Map<string, StoryNode>();

  async getWorld(worldId: string): Promise<WorldPackage | null> {
    return this.worlds.get(worldId) ?? null;
  }

  async getWorldsByCreator(creatorId: string): Promise<WorldPackage[]> {
    return [...this.worlds.values()].filter((w) => w.creatorId === creatorId);
  }

  async saveWorld(world: WorldPackage): Promise<void> {
    this.worlds.set(world.id, world);
  }

  async deleteWorld(worldId: string): Promise<void> {
    this.worlds.delete(worldId);
  }

  async getNpcs(worldId: string): Promise<Npc[]> {
    return [...this.npcs.values()].filter((n) => n.worldId === worldId);
  }

  async saveNpc(npc: Npc): Promise<void> {
    this.npcs.set(npc.id, npc);
  }

  async deleteNpc(npcId: string): Promise<void> {
    this.npcs.delete(npcId);
  }

  async getStoryNodes(worldId: string): Promise<StoryNode[]> {
    return [...this.nodes.values()]
      .filter((n) => n.worldId === worldId)
      .sort((a, b) => a.order - b.order);
  }

  async saveStoryNode(node: StoryNode): Promise<void> {
    this.nodes.set(node.id, node);
  }

  async updateNodeStatus(nodeId: string, status: StoryNodeStatus): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.status = status;
    }
  }

  clear(): void {
    this.worlds.clear();
    this.npcs.clear();
    this.nodes.clear();
  }
}
