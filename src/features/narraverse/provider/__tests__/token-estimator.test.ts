import { describe, it, expect } from "vitest";
import { estimateTokens, estimateCost, detectCacheHit } from "../token-estimator.js";

describe("estimateTokens", () => {
  it("should return 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("should estimate English text at ~4 chars per token", () => {
    const tokens = estimateTokens("Hello, how are you doing today?");
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThanOrEqual(Math.ceil("Hello, how are you doing today?".length / 3));
  });

  it("should estimate Chinese text at ~1.5 chars per token", () => {
    const text = "你好，今天天气真好";
    const tokens = estimateTokens(text);
    // Chinese chars ≈ 1.5 chars/token, so 10 chars ≈ 7 tokens
    expect(tokens).toBeGreaterThanOrEqual(Math.ceil(text.length / 1.6));
    expect(tokens).toBeLessThanOrEqual(Math.ceil(text.length / 1.2));
  });

  it("should estimate Japanese text correctly", () => {
    const text = "こんにちは、元気ですか";
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThanOrEqual(text.length * 2);
  });

  it("should estimate Korean text correctly", () => {
    const text = "안녕하세요";
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(0);
  });

  it("should handle mixed CJK and Latin text", () => {
    const text = "Hello 你好 World 世界";
    const tokens = estimateTokens(text);
    // CJK: 4 chars / 1.5 ≈ 3, Latin: 10 chars / 4 ≈ 3, total ≈ 6
    expect(tokens).toBeGreaterThanOrEqual(4);
    expect(tokens).toBeLessThanOrEqual(10);
  });

  it("should ignore spaces and newlines for Latin counting", () => {
    const text1 = "hello world";
    const text2 = "helloworld";
    // Spaces don't add tokens, so they should estimate roughly the same
    const t1 = estimateTokens(text1);
    const t2 = estimateTokens(text2);
    expect(Math.abs(t1 - t2)).toBeLessThanOrEqual(2);
  });

  it("should be monotonic — longer text = more tokens", () => {
    const short = estimateTokens("hi");
    const longer = estimateTokens("hi there, how is everything going?");
    expect(longer).toBeGreaterThan(short);
  });
});

describe("estimateCost", () => {
  it("should return 0 for custom provider", () => {
    const cost = estimateCost("custom", 1000, 500);
    expect(cost).toBe(0);
  });

  it("should compute deepseek cost correctly", () => {
    // deepseek: $0.14/M input, $0.28/M output
    // 1M input tokens = $0.14, 1M output = $0.28 → $0.42
    const cost = estimateCost("deepseek", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.42, 2);
  });

  it("should compute grok cost correctly", () => {
    // grok: $2/M input, $8/M output
    const cost = estimateCost("grok", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(10.0, 1);
  });

  it("should compute openai cost correctly", () => {
    const cost = estimateCost("openai", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(12.5, 1);
  });

  it("should return 0 for unknown provider", () => {
    const cost = estimateCost("nonexistent_provider", 1_000_000, 1_000_000);
    expect(cost).toBe(0);
  });

  it("should scale linearly with tokens", () => {
    const cost1 = estimateCost("deepseek", 1000, 500);
    const cost2 = estimateCost("deepseek", 2000, 1000);
    expect(cost2).toBeCloseTo(cost1 * 2, 5);
  });

  it("should handle zero tokens", () => {
    expect(estimateCost("deepseek", 0, 0)).toBe(0);
    expect(estimateCost("grok", 0, 0)).toBe(0);
  });
});

describe("detectCacheHit", () => {
  it("should detect X-DS-Cache-Hit header", () => {
    expect(detectCacheHit({ "x-ds-cache-hit": "true" })).toBe(true);
  });

  it("should detect X-Cache-Hit header", () => {
    expect(detectCacheHit({ "x-cache-hit": "true" })).toBe(true);
  });

  it("should detect X-OpenAI-Cache-Hit header", () => {
    expect(detectCacheHit({ "x-openai-cache-hit": "true" })).toBe(true);
  });

  it("should detect cache hit with '1' value", () => {
    expect(detectCacheHit({ "x-ds-cache-hit": "1" })).toBe(true);
  });

  it("should return false when no cache headers present", () => {
    expect(detectCacheHit({ "content-type": "application/json" })).toBe(false);
  });

  it("should return false for cache header with false value", () => {
    expect(detectCacheHit({ "x-ds-cache-hit": "false" })).toBe(false);
  });

  it("should return false for cache header with 0 value", () => {
    expect(detectCacheHit({ "x-ds-cache-hit": "0" })).toBe(false);
  });

  it("should be case-insensitive for header values", () => {
    expect(detectCacheHit({ "x-ds-cache-hit": "TRUE" })).toBe(true);
    expect(detectCacheHit({ "x-ds-cache-hit": "True" })).toBe(true);
  });

  it("should handle empty headers", () => {
    expect(detectCacheHit({})).toBe(false);
  });
});
