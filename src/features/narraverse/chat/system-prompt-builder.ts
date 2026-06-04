/**
 * buildFinalSystemPrompt — unified prompt builder for 叙境 (Xujing).
 *
 * Merges 5 previously-separate prompt layers into a single, token-efficient
 * system prompt with no behavioral changes:
 *
 *   1. Persona (persona.injector.ts)
 *   2. World (story.templates.ts)
 *   3. Memory (memory.template.ts)
 *   4. Liveness (character/liveness-engine.ts)
 *   5. Relationship (relationship/evolution-engine.ts)
 *
 * Design goals:
 *   - Single entry point → no duplicate sections
 *   - Stable section ordering for DeepSeek cache anchoring
 *   - No behavior change from individual layer outputs
 *   - Token budget awareness (target: < 2000 tokens for cache hit)
 */

import type { PersonaFingerprint } from "../persona/persona.types.js";
import { injectPersona } from "../persona/persona.injector.js";
import type { MemoryTemplateContext } from "../memory/memory.template.js";
import { renderMemoryPrompt } from "../memory/memory.template.js";
import type { WorldContext } from "../story/story.types.js";
import { buildWorldSystemPrompt } from "../story/story.templates.js";
import type { CharacterData, RelationshipData } from "../chat/chat.types.js";
import type { InternalState } from "../character/internal-state.js";

// ===========================================================================
// Input
// ===========================================================================

export interface FinalSystemPromptInput {
  /** Persona fingerprint (from persona.builder.ts) */
  persona: PersonaFingerprint;
  /** Persona injection context (intimacy, worldType) */
  personaCtx: { intimacy: number; worldType?: string };
  /** World context for story/world prompt layer */
  world?: WorldContext;
  /** Memory template context (from memory.template.ts) */
  memory?: MemoryTemplateContext;
  /** Character liveness state (from liveness-engine.ts) */
  liveness?: { characterName: string; state: InternalState };
  /** Character + relationship data for bridging section */
  character: CharacterData;
  relationship: RelationshipData;
  /** Whether to include liveness context (only on user return) */
  includeLiveness?: boolean;
  /** Whether this is a VIP user (affects detail level) */
  isVip?: boolean;
}

export interface FinalSystemPromptResult {
  systemPrompt: string;
  estimatedTokens: number;
  sections: {
    persona: boolean;
    world: boolean;
    memory: boolean;
    liveness: boolean;
    relationship: boolean;
  };
}

// ===========================================================================
// Core
// ===========================================================================

export function buildFinalSystemPrompt(
  input: FinalSystemPromptInput,
): FinalSystemPromptResult {
  const sections: string[] = [];
  const active: FinalSystemPromptResult["sections"] = {
    persona: false,
    world: false,
    memory: false,
    liveness: false,
    relationship: false,
  };

  // ── Section 1: Persona (always included, cache-anchor) ───────────
  const personaText = injectPersona(input.persona, input.personaCtx);
  sections.push(personaText);
  active.persona = true;

  // ── Section 2: Relationship bridge ───────────────────────────────
  const relSection = buildRelationshipSection(input.character, input.relationship);
  if (relSection) {
    sections.push(relSection);
    active.relationship = true;
  }

  // ── Section 3: World context (if world is selected) ──────────────
  if (input.world) {
    const worldText = buildWorldSystemPrompt(input.world);
    sections.push("\n" + worldText);
    active.world = true;
  }

  // ── Section 4: Liveness (on user return, if available) ───────────
  if (input.includeLiveness && input.liveness) {
    const livenessText = buildLivenessSection(input.liveness.characterName, input.liveness.state);
    if (livenessText) {
      sections.push("\n" + livenessText);
      active.liveness = true;
    }
  }

  // ── Section 5: Memory (last — variable length) ───────────────────
  if (input.memory) {
    const memoryText = renderMemoryPrompt(input.memory);
    if (memoryText) {
      sections.push("\n" + memoryText);
      active.memory = true;
    }
  }

  // ── Final assembly ───────────────────────────────────────────────
  const systemPrompt = sections.join("\n");
  const estimatedTokens = estimateTokenCount(systemPrompt);

  return { systemPrompt, estimatedTokens, sections: active };
}

// ===========================================================================
// Section builders
// ===========================================================================

function buildRelationshipSection(
  character: CharacterData,
  relationship: RelationshipData,
): string {
  const overall = Math.round(
    (relationship.affection + relationship.trust + relationship.intimacy) / 3,
  );
  const phase =
    overall < 25 ? "初识" :
    overall < 45 ? "相识" :
    overall < 65 ? "朋友" :
    overall < 85 ? "亲近" : "亲密";

  return [
    "",
    "[当前关系]",
    "角色：" + character.name,
    "关系阶段：" + phase,
    "好感：" + String(relationship.affection),
    "信任：" + String(relationship.trust),
    "亲密：" + String(relationship.intimacy),
    "",
    "[对话开始]",
  ].join("\n");
}

function buildLivenessSection(
  characterName: string,
  _state: InternalState,
): string {
  // Lightweight liveness note — avoids token bloat from full reflections
  const lines: string[] = [];

  if (_state.monologue.length > 0) {
    const recent = _state.monologue.slice(-2);
    lines.push(
      "[" + characterName + "的近况]",
      ...recent.map((m) => "· " + m.thought),
    );
  }

  if (_state.reflections && _state.reflections.length > 0) {
    const recentRef = _state.reflections.slice(-1);
    lines.push(
      ...recentRef.map((r) => "· " + r.reflection.slice(0, 80)),
    );
  }

  return lines.length > 0 ? lines.join("\n") : "";
}

// ===========================================================================
// Token estimation (lightweight, no NLP library)
// ===========================================================================

function estimateTokenCount(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g) ?? []).length;
  const otherChars = (text.match(/[^\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\s]/g) ?? []).length;
  return Math.ceil(chineseChars * 1.3 + otherChars * 0.3);
}
