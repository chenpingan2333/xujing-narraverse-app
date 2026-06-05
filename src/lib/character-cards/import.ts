/**
 * 角色卡导入逻辑
 */

import type { TavernCardV2, ChubCard, ImportPreview } from "./types";
import { detectCardFormat } from "./types";
import { mapTavernToPreview, mapChubToPreview } from "./field-map";

export interface ImportResult {
  preview: ImportPreview;
  error?: string;
}

export function parseImportJson(json: unknown): ImportResult {
  if (!json || typeof json !== "object") {
    return { preview: null as unknown as ImportPreview, error: "无效的 JSON 数据" };
  }

  const format = detectCardFormat(json);

  if (format === "tavern") {
    return { preview: mapTavernToPreview(json as TavernCardV2) };
  }

  if (format === "chub") {
    return { preview: mapChubToPreview(json as ChubCard) };
  }

  // 尝试作为 Tavern 解析
  const obj = json as Record<string, unknown>;
  if (obj["data"] && typeof obj["data"] === "object") {
    return { preview: mapTavernToPreview(json as TavernCardV2) };
  }

  return { preview: null as unknown as ImportPreview, error: "无法识别的角色卡格式（支持 Tavern V2 和 Chub.ai）" };
}