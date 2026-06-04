import type { StoryRepository, StoryEngineResult } from "./story.types.js";
import { loadWorldWithContext, buildWorldContext } from "./story.world.js";
import { getTriggeredNpcs } from "./story.npc.js";
import { checkNodeCompletion, progressStory, getCurrentNode } from "./story.node.js";
import { buildWorldSystemPrompt, buildNodeTransitionPrompt } from "./story.templates.js";
import type { ProviderGateway } from "../provider/index.js";

export class StoryEngine {
  constructor(
    private readonly repo: StoryRepository,
    private readonly providerGateway: ProviderGateway,
    private readonly userId: string,
    private readonly isVip: boolean,
  ) {}

  async processTurn(params: {
    worldId: string;
    conversationText: string;
    conversationHistory: string;
    characterTier?: string;
    worldTier?: string;
  }): Promise<StoryEngineResult> {
    const { worldId, conversationText, conversationHistory, characterTier, worldTier } = params;

    const loaded = await loadWorldWithContext(this.repo, worldId);
    if (!loaded) {
      throw new Error(`World not found: ${worldId}`);
    }

    const { world, npcs, nodes } = loaded;
    let context = loaded.context;

    const triggeredNpcs = getTriggeredNpcs(npcs, conversationText);
    const npcResponses: Array<{ npcId: string; npcName: string; content: string }> = [];

    for (const npc of triggeredNpcs) {
      const systemPrompt = buildWorldSystemPrompt(context);
      const interventionLogic = npc.advanced?.storyInterventionLogic ?? "";
      const npcPersona = `[${npc.name}] ${npc.identity}. ${interventionLogic}`;

      // Unified LLM call through ProviderGateway
      const response = await this.providerGateway.chat({
        userId: this.userId,
        isVip: this.isVip,
        worldTier,
        characterTier,
        messages: [
          { role: "system", content: `${systemPrompt}\n\n${npcPersona}` },
          { role: "user", content: `[对话历史]\n${conversationHistory}\n\n[当前对话]\n${conversationText}` },
        ],
      });

      npcResponses.push({
        npcId: npc.id,
        npcName: npc.name,
        content: response.content,
      });
    }

    const currentNode = context.currentNode;
    let nodeChanged = false;
    let completedNodeIds: string[] = [];
    let newCurrentNodeId: string | null = currentNode?.id ?? null;

    if (currentNode && checkNodeCompletion(currentNode, conversationText)) {
      const changedNodes = progressStory(nodes, currentNode);
      nodeChanged = changedNodes.length > 0;
      completedNodeIds = changedNodes
        .filter((n) => n.status === "completed")
        .map((n) => n.id);

      for (const node of changedNodes) {
        await this.repo.updateNodeStatus(node.id, node.status);
      }

      if (nodeChanged && changedNodes.length >= 2) {
        const completedNode = changedNodes.find((n) => n.status === "completed");
        const unlockedNode = changedNodes.find((n) => n.status === "unlocked");
        if (completedNode && unlockedNode) {
          const transitionMsg = buildNodeTransitionPrompt(
            completedNode,
            unlockedNode,
          );
          npcResponses.push({
            npcId: "system",
            npcName: "system",
            content: transitionMsg,
          });
        }
      }

      newCurrentNodeId = getCurrentNode(nodes)?.id ?? null;
    }

    context = buildWorldContext(world, npcs, nodes);
    const worldPrompt = buildWorldSystemPrompt(context);

    return {
      worldContext: context,
      npcResponses,
      nodeProgress: {
        currentNodeId: newCurrentNodeId,
        changed: nodeChanged,
        completedNodeIds,
      },
      worldPrompt,
    };
  }
}
