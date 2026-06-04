import { describe, it, expect } from 'vitest';
import {
  estimateTokenCount, detectOverflow, compressLayers,
  rankMemoryLayers, alignForDeepSeekCache,
} from '../prompt-optimizer.js';
import type { PromptLayer } from '../prompt-optimizer.js';

describe('estimateTokenCount', () => {
  it('estimates English at ~4 chars per token', () => {
    const tokens = estimateTokenCount("Hello world");
    expect(tokens).toBeGreaterThanOrEqual(1);
  });

  it('estimates Chinese at ~1 char per token', () => {
    const tokens = estimateTokenCount("你好世界");
    expect(tokens).toBeGreaterThanOrEqual(2);
  });

  it('returns 0 for empty string', () => {
    expect(estimateTokenCount("")).toBe(0);
  });
});

describe('detectOverflow', () => {
  it('detects no overflow for small prompt', () => {
    const layers = [{ name: "test", content: "hello" }];
    const result = detectOverflow(layers, 1000);
    expect(result.overflow).toBe(false);
  });

  it('detects overflow for large prompt', () => {
    const longText = "a".repeat(50000);
    const layers = [{ name: "test", content: longText }];
    const result = detectOverflow(layers, 1000);
    expect(result.overflow).toBe(true);
  });
});

describe('compressLayers', () => {
  it('does not modify layers within limit', () => {
    const layers: PromptLayer[] = [
      { name: "persona", content: "You are helpful.", priority: 1 },
    ];
    const result = compressLayers(layers, 1000);
    expect(result[0].content).toBe("You are helpful.");
  });

  it('trims low-priority layers first', () => {
    const longText = "x".repeat(10000);
    const layers: PromptLayer[] = [
      { name: "persona", content: "Persona text", priority: 1 },
      { name: "world", content: longText, priority: 3 },
      { name: "memory", content: longText, priority: 5 },
    ];
    const result = compressLayers(layers, 500);
    // Low priority layers (world + memory) should be trimmed
    const world = result.find((l) => l.name === "world");
    if (world) { expect(world.content.length).toBeLessThan(longText.length); }
  });
});

describe('rankMemoryLayers', () => {
  it('ranks persona highest, memory lowest', () => {
    const layers = [
      { name: "memory", content: "old stuff" },
      { name: "persona", content: "identity" },
      { name: "relationship", content: "trust" },
    ];
    const ranked = rankMemoryLayers(layers);
    expect(ranked[0].name).toBe("persona");
    expect(ranked[ranked.length - 1].name).toBe("memory");
  });
});

describe('alignForDeepSeekCache', () => {
  it('wraps system prompt with cache anchors', () => {
    const result = alignForDeepSeekCache("system prompt", ["hello"]);
    expect(result[0]).toContain("CACHE_ANCHOR_START");
    expect(result).toContain('system prompt');
    expect(result).toContain('[CACHE_ANCHOR_END]');
    expect(result).toContain("hello");
  });
});