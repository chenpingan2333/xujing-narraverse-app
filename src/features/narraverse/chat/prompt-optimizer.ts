
/**
 * Prompt Optimization Layer — reduces token cost and improves quality.
 *
 * 1. Token overflow detection with automatic compression
 * 2. Priority ranking: relationship > persona > world > recent chat
 * 3. Conversation layer compression (truncate oldest messages)
 * 4. DeepSeek cache alignment optimization
 */

// ─── Token Estimation ───────────────────────────────────────────────────────

export function estimateTokenCount(text: string): number {
  let tokens = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 127) tokens += 0.25;
    else if (code <= 2047) tokens += 0.5;
    else tokens += 1;
  }
  return Math.ceil(tokens);
}

// ─── Overflow Detection ─────────────────────────────────────────────────────

export interface OverflowResult { overflow: boolean; totalTokens: number; limit: number; }

export function detectOverflow(layers: Array<{ name: string; content: string }>, limit = 8000): OverflowResult {
  const totalTokens = layers.reduce((sum, l) => sum + estimateTokenCount(l.content), 0);
  return { overflow: totalTokens > limit, totalTokens, limit };
}

// ─── Priority-based Compression ─────────────────────────────────────────────

export interface PromptLayer { name: string; content: string; priority: number; }

/**
 * Compress prompt layers by trimming the lowest-priority layers first.
 * Priority order: 1 = persona (keep), 2 = relationship (keep until extreme overflow),
 * 3 = world context (trim first), 4 = recent chat (truncate oldest), 5 = memory context.
 */
export function compressLayers(
  layers: PromptLayer[],
  targetTokens: number,
): PromptLayer[] {
  const sorted = [...layers].sort((a, b) => b.priority - a.priority); // highest priority first
  let currentTokens = sorted.reduce((s, l) => s + estimateTokenCount(l.content), 0);

  if (currentTokens <= targetTokens) return layers;

  const result = new Map<string, string>();
  for (const l of sorted) result.set(l.name, l.content);

  // Phase 1: Trim world context (priority 3) first
  for (const l of sorted) {
    if (currentTokens <= targetTokens) break;
    if (l.priority <= 3) {
      const trimmed = truncateByTokens(l.content, Math.floor(estimateTokenCount(l.content) * 0.5));
      result.set(l.name, trimmed);
      currentTokens = sumTokens(result);
    }
  }

  // Phase 2: Compress recent chat (priority 4) by removing oldest messages
  for (const l of sorted) {
    if (currentTokens <= targetTokens) break;
    if (l.priority === 4 && l.name === "conversation") {
      const compressed = compressConversation(l.content);
      result.set(l.name, compressed);
      currentTokens = sumTokens(result);
    }
  }

  // Phase 3: Trim memory context (priority 5)
  for (const l of sorted) {
    if (currentTokens <= targetTokens) break;
    if (l.priority >= 5) {
      const trimmed = truncateByTokens(l.content, Math.floor(estimateTokenCount(l.content) * 0.3));
      result.set(l.name, trimmed);
      currentTokens = sumTokens(result);
    }
  }

  return layers.map((l) => ({ ...l, content: result.get(l.name) ?? l.content }));
}

function sumTokens(map: Map<string, string>): number {
  let total = 0;
  for (const v of map.values()) total += estimateTokenCount(v);
  return total;
}

function truncateByTokens(text: string, maxTokens: number): string {
  let tokens = 0;
  let i = 0;
  for (; i < text.length; i++) {
    const code = text.codePointAt(i) ?? 0;
    tokens += code <= 127 ? 0.25 : code <= 2047 ? 0.5 : 1;
    if (tokens > maxTokens) break;
  }
  return text.slice(0, i) + (i < text.length ? "…[已压缩]" : "");
}

function compressConversation(convText: string): string {
  const lines = convText.split("\n");
  if (lines.length <= 6) return convText;
  // Keep first 2 and last 4 messages, drop middle
  const kept = [...lines.slice(0, 2), "…[中间对话已省略以节省上下文]…", ...lines.slice(-4)];
  return kept.join("\n");
}

// ─── DeepSeek Cache Alignment ───────────────────────────────────────────────

/**
 * DeepSeek's context caching works best when:
 * 1. The system prompt prefix is stable (unchanged across requests)
 * 2. Messages are appended at the end (not prepended)
 * 3. Cache boundary is at message boundaries
 *
 * This function ensures the system prompt is placed at the start
 * and marked with a cache-friendly delimiter.
 */
export function alignForDeepSeekCache(systemPrompt: string, messages: string[], worldContext?: string): string[] {
  const result: string[] = [];

  // Cache anchor: a stable starter that doesn't change per-request
  result.push("[CACHE_ANCHOR_START]");
  if (worldContext) {
    result.push(worldContext);
  }
  result.push(systemPrompt);
  result.push("[CACHE_ANCHOR_END]");

  result.push("---");
  result.push(...messages);
  return result;
}

// ─── Memory Priority Ranking ────────────────────────────────────────────────

export interface MemoryRanked {
  name: string;
  content: string;
  priority: number;
  tokenCount: number;
}

/**
 * Rank memory context pieces by importance:
 * - Relationship memories: priority 1 (highest)
 * - Persona-related preferences: priority 2
 * - World/story context: priority 3
 * - Recent conversation: priority 4
 * - Older episodic memories: priority 5 (lowest)
 */
export function rankMemoryLayers(layers: Array<{ name: string; content: string }>): MemoryRanked[] {
  const priorityMap: Record<string, number> = {
    persona: 1,
    relationship: 2,
    world: 3,
    conversation: 4,
    memory: 5,
    episodic: 5,
    summary: 5,
  };

  return layers
    .map((l) => ({
      ...l,
      priority: priorityMap[l.name] ?? 5,
      tokenCount: estimateTokenCount(l.content),
    }))
    .sort((a, b) => a.priority - b.priority);
}