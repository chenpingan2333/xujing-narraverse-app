/**
 * 角色卡导出逻辑
 */

import { characterToTavernCard } from "./field-map";
import type { TavernCardV2 } from "./types";

export function exportCharacterCard(row: Record<string, unknown>): TavernCardV2 {
  return characterToTavernCard(row);
}

export function exportCharacterCardJson(row: Record<string, unknown>): string {
  return JSON.stringify(characterToTavernCard(row), null, 2);
}