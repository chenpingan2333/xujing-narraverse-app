/**
 * 字段映射 — Tavern/Chub → 叙境 characters 表
 */

import type { TavernCardV2, TavernCardData, ChubCard, ImportPreview, NarraverseExtensions } from "./types";

export function mapTavernToPreview(card: TavernCardV2): ImportPreview {
  const d = card.data;
  const ext = d.extensions?.narraverse;
  return {
    source: "tavern",
    name: d.name || "",
    persona: d.personality || d.description || "",
    description: d.description || d.personality || "",
    greeting: d.first_mes || (d.alternate_greetings?.[0] ?? ""),
    speechStyle: ext?.speechStyle || "",
    worldView: ext?.worldView || "",
    storyNodes: ext?.storyNodes || [],
    tags: d.tags || [],
    rawJson: card,
  };
}

export function mapChubToPreview(card: ChubCard): ImportPreview {
  const d = card.data;
  return {
    source: "chub",
    name: d?.name || card.name || "",
    persona: d?.personality || card.personality || d?.description || card.description || "",
    description: d?.description || card.description || d?.personality || card.personality || "",
    greeting: d?.first_mes || card.first_mes || "",
    speechStyle: "",
    worldView: "",
    storyNodes: [],
    tags: card.tags || [],
    rawJson: card,
  };
}

export function previewToInsert(preview: ImportPreview, userId: string) {
  return {
    user_id: userId,
    name: preview.name,
    persona: preview.persona,
    description: preview.description,
    greeting: preview.greeting,
    speech_style: preview.speechStyle,
    world_view: preview.worldView,
    story_nodes: JSON.stringify(preview.storyNodes),
    rarity: "normal",
    price_star: 0,
    is_verified: false,
    is_official: false,
    tags: preview.tags,
  };
}

export function characterToTavernCard(row: Record<string, unknown>): TavernCardV2 {
  const ext: NarraverseExtensions = {
    speechStyle: (row["speech_style"] as string) || "",
    worldView: (row["world_view"] as string) || "",
    storyNodes: typeof row["story_nodes"] === "string"
      ? JSON.parse(row["story_nodes"] as string)
      : (row["story_nodes"] as NarraverseExtensions["storyNodes"]) || [],
  };

  return {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: (row["name"] as string) || "",
      description: (row["description"] as string) || "",
      personality: (row["persona"] as string) || "",
      scenario: (row["background"] as string) || "",
      first_mes: (row["greeting"] as string) || "",
      system_prompt: "",
      tags: (row["tags"] as string[]) || [],
      creator: "叙境 Narraverse",
      character_version: "1.0",
      extensions: { narraverse: ext },
    },
  };
}