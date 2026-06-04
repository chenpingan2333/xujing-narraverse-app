import { randomUUID } from "node:crypto";
import type { StoryNode } from "./story.types.js";

interface CreateStoryNodeInput {
  worldId: string;
  order: number;
  title: string;
  description: string;
  triggerCondition: string;
  completionCondition: string;
  dialogues: Array<{ speaker: string; content: string }>;
  rewards?: string[];
}

export function createStoryNode(input: CreateStoryNodeInput): StoryNode {
  return {
    id: randomUUID(),
    worldId: input.worldId,
    order: input.order,
    title: input.title,
    description: input.description,
    status: input.order === 0 ? "unlocked" : "locked",
    triggerCondition: input.triggerCondition,
    completionCondition: input.completionCondition,
    dialogues: input.dialogues,
    rewards: input.rewards ?? [],
    createdAt: Date.now(),
  };
}

export function checkNodeCompletion(
  node: StoryNode,
  conversationText: string,
): boolean {
  if (node.status !== "unlocked") return false;

  const keywords = node.completionCondition
    .split(/[,，、\s]+/)
    .filter((k) => k.length > 0);

  return keywords.every((kw) => conversationText.includes(kw));
}

export function progressStory(
  nodes: StoryNode[],
  currentNode: StoryNode,
): StoryNode[] {
  const sorted = [...nodes].sort((a, b) => a.order - b.order);
  const changed: StoryNode[] = [];

  const current = sorted.find((n) => n.id === currentNode.id);
  if (current && current.status === "unlocked") {
    current.status = "completed";
    changed.push(current);
  }

  const nextOrder = currentNode.order + 1;
  const next = sorted.find((n) => n.order === nextOrder);
  if (next && next.status === "locked") {
    next.status = "unlocked";
    changed.push(next);
  }

  return changed;
}

export function isStoryComplete(nodes: StoryNode[]): boolean {
  if (nodes.length === 0) return false;
  return nodes.every((n) => n.status === "completed");
}

export function getCurrentNode(nodes: StoryNode[]): StoryNode | null {
  return nodes
    .filter((n) => n.status === "unlocked")
    .sort((a, b) => a.order - b.order)[0] ?? null;
}
