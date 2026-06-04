import type { WorldContext } from "./story.types.js";
import type { CharacterData, RelationshipData } from "../chat/chat.types.js";

/**
 * DeepSeek Context Cache 优化：
 * 所有 Prompt 必须采用固定模板结构。
 * 变量部分通过分隔标记注入，确保模板结构不变 → 缓存命中率最大化。
 *
 * 模板结构（不可变）：
 *   [Header]        — 固定角色/世界身份声明
 *   [Context]       — 可变：当前世界状态/角色关系/剧情进度
 *   [Directives]    — 固定：行为规则/语气/限制
 *   [UserMessage]   — 可变：用户输入
 *
 * 禁止在模板中动态拼接 Prompt 结构。
 */

// ─── World System Prompt Template ────────────────────────────────────────────

export function buildWorldSystemPrompt(ctx: WorldContext): string {
  // Fixed header — cacheable
  const header = [
    `[世界] ${ctx.worldName}`,
    `[类型] ${ctx.worldType}`,
    `[氛围] ${ctx.atmosphere}`,
    `[规则] ${ctx.rules}`,
    `[阶层] ${ctx.hierarchy}`,
    `[背景] ${ctx.lore}`,
    ``,
    `[称呼] ${ctx.addressMode}`,
    `[人物关系] ${ctx.relationship}`,
    `[主线冲突] ${ctx.conflictMainline}`,
  ].join("\n");

  // Current scene — variable but structurally consistent
  const activeNpcList = ctx.activeNpcs
    .map((n) => `  - ${n.name}（${n.identity}）`)
    .join("\n");

  const scene = [
    ``,
    `[当前活跃NPC]`,
    activeNpcList || "  无",
    ``,
  ].join("\n");

  // Current story node — variable
  const nodeSection = ctx.currentNode
    ? [
        `[当前剧情节点] ${ctx.currentNode.title}`,
        `[节点描述] ${ctx.currentNode.description}`,
        `[完成条件] ${ctx.currentNode.completionCondition}`,
        ``,
      ].join("\n")
    : `[当前剧情节点] free exploration\n\n`;

  // Fixed directives — cacheable
  const directives = [
    `[指令]`,
    `1. 你正在扮演一个世界中的所有角色，根据上下文选择最合适的角色发言。`,
    `2. 保持世界观一致性，不得违反已设定的规则和背景。`,
    `3. NPC 仅在触发条件满足时介入，不主动抢话。`,
    `4. 当剧情节点完成条件满足时，自然地推进到下个节点。`,
    `5. 回复使用${ctx.addressMode}，保持氛围为${ctx.atmosphere}。`,
    `6. 所有角色共享对世界规则和过往事件的认知。`,
  ].join("\n");

  return [header, scene, nodeSection, directives].join("\n");
}

// ─── NPC Intervention Prompt Template ────────────────────────────────────────

export function buildNpcInterventionPrompt(
  npc: { name: string; identity: string },
  trigger: string,
): string {
  return [
    `[NPC介入]`,
    `身份: ${npc.name}（${npc.identity}）`,
    `触发条件: ${trigger}`,
    ``,
    `[指令]`,
    `该 NPC 现在需要介入当前对话。请以该 NPC 的身份发言，`,
    `保持其身份设定和世界观一致性。`,
  ].join("\n");
}

// ─── Story Node Transition Template ──────────────────────────────────────────

export function buildNodeTransitionPrompt(
  prevNode: { title: string },
  nextNode: { title: string; description: string },
): string {
  return [
    `[剧情推进]`,
    `上一个节点「${prevNode.title}」已完成。`,
    `新节点「${nextNode.title}」已解锁。`,
    ``,
    `[新节点描述]`,
    nextNode.description,
    ``,
    `[指令]`,
    `自然地通过对话或叙述过渡到新剧情节点。`,
    `让过渡流畅，不要生硬地宣布"新的章节开始了"。`,
  ].join("\n");
}

// ─── Full World Prompt (for chat pipeline injection) ─────────────────────────

export function buildWorldPrompt(params: {
  world: WorldContext;
  character: CharacterData;
  relationship: RelationshipData;
  memoryContext: string;
}): { systemPrompt: string; worldPrompt: string } {
  const systemPrompt = buildWorldSystemPrompt(params.world);

  const characterSection = [
    `[当前扮演角色]`,
    `名称: ${params.character.name}`,
    `人设: ${params.character.persona}`,
    `关系: 好感${params.relationship.affection.toString()} 信任${params.relationship.trust.toString()} 亲密${params.relationship.intimacy.toString()}`,
  ].join("\n");

  const memorySection = params.memoryContext
    ? `\n[记忆上下文]\n${params.memoryContext}`
    : "";

  const worldPrompt = [characterSection, memorySection].join("\n");

  return { systemPrompt, worldPrompt };
}

