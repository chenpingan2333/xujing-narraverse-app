/**
 * Character Card 类型定义
 * 支持 Tavern Character Card V2 和 Chub.ai 格式
 */

// ── Tavern Character Card V2 ────────────────────────────

export interface TavernCardV2 {
  spec: "chara_card_v2";
  spec_version: "2.0";
  data: TavernCardData;
}

export interface TavernCardData {
  name: string;
  description?: string;
  personality?: string;
  scenario?: string;
  first_mes?: string;
  mes_example?: string;
  creator_notes?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  alternate_greetings?: string[];
  character_book?: unknown;
  tags?: string[];
  creator?: string;
  character_version?: string;
  extensions?: TavernExtensions;
}

export interface TavernExtensions {
  narraverse?: NarraverseExtensions;
  [key: string]: unknown;
}

export interface NarraverseExtensions {
  speechStyle?: string;
  worldView?: string;
  storyNodes?: StoryNode[];
}

export interface StoryNode {
  title: string;
  trigger: string;
}

// ── Chub.ai Format ──────────────────────────────────────

export interface ChubCard {
  name: string;
  description?: string;
  personality?: string;
  first_mes?: string;
  mes_example?: string;
  scenario?: string;
  creator_notes?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  tags?: string[];
  creator?: string;
  character_version?: string;
  // Chub 特有的嵌套结构
  data?: {
    name?: string;
    description?: string;
    personality?: string;
    first_mes?: string;
    mes_example?: string;
    scenario?: string;
  };
}

// ── 导入预览结构 ────────────────────────────────────────

export interface ImportPreview {
  source: "tavern" | "chub" | "unknown";
  name: string;
  persona: string;
  description: string;
  greeting: string;
  speechStyle: string;
  worldView: string;
  storyNodes: StoryNode[];
  tags: string[];
  rawJson: unknown;
}

// ── 检测函数 ────────────────────────────────────────────

export function detectCardFormat(json: unknown): "tavern" | "chub" | "unknown" {
  if (typeof json !== "object" || json === null) return "unknown";
  const obj = json as Record<string, unknown>;
  if (obj["spec"] === "chara_card_v2") return "tavern";
  if (typeof obj["name"] === "string" && (obj["first_mes"] || obj["description"] || obj["personality"])) {
    return "chub";
  }
  return "unknown";
}