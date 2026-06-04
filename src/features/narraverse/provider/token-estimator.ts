/**
 * Token estimator — approximate token counts without calling external APIs.
 *
 * Uses a simple character-based heuristic:
 * - English: ~4 chars per token
 * - Chinese/Japanese/Korean: ~1.5 chars per token
 * - Mixed content uses a weighted average
 */

const CJK_RANGES = [
  [0x4e00, 0x9fff], // CJK Unified
  [0x3400, 0x4dbf], // CJK Unified Extension A
  [0x3000, 0x303f], // CJK Symbols
  [0xff00, 0xffef], // Halfwidth/Fullwidth
  [0x3040, 0x309f], // Hiragana
  [0x30a0, 0x30ff], // Katakana
  [0xac00, 0xd7af], // Hangul
];

function isCJK(charCode: number): boolean {
  return CJK_RANGES.some(([lo, hi]) => charCode >= lo && charCode <= hi);
}

export function estimateTokens(text: string): number {
  if (!text) return 0;

  let cjkChars = 0;
  let latinChars = 0;

  for (let i = 0; i < text.length; i++) {
    if (isCJK(text.charCodeAt(i))) {
      cjkChars++;
    } else if (text[i] !== " " && text[i] !== "\n") {
      latinChars++;
    }
  }

  // CJK: ~1.5 chars/token, Latin: ~4 chars/token
  const cjkTokens = cjkChars / 1.5;
  const latinTokens = latinChars / 4;

  return Math.ceil(cjkTokens + latinTokens);
}

/**
 * Estimate cost based on provider pricing.
 * Prices are per 1M tokens.
 */
const DEFAULT_PRICES = { input: 0, output: 0 };
const PROVIDER_PRICES: Record<string, { input: number; output: number } | undefined> = {
  deepseek: { input: 0.14, output: 0.28 },
  grok: { input: 2.0, output: 8.0 },
  openai: { input: 2.5, output: 10.0 },
  anthropic: { input: 3.0, output: 15.0 },
  gemini: { input: 1.25, output: 5.0 },
  custom: DEFAULT_PRICES,
};

export function estimateCost(
  providerId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const prices = PROVIDER_PRICES[providerId] ?? DEFAULT_PRICES;
  const inputCost = (inputTokens / 1_000_000) * prices.input;
  const outputCost = (outputTokens / 1_000_000) * prices.output;
  return Math.round((inputCost + outputCost) * 10000) / 10000;
}

/**
 * DeepSeek context cache hit detection.
 * DeepSeek returns cache hit info via response headers.
 * This utility checks for common cache indicators.
 */
export function detectCacheHit(
  headers: Record<string, string | undefined>,
): boolean {
  // DeepSeek uses X-DS-Cache-Hit or similar
  const cacheHeader =
    headers["x-ds-cache-hit"] ??
    headers["x-cache-hit"] ??
    headers["x-openai-cache-hit"] ??
    "";
  return cacheHeader.toLowerCase() === "true" || cacheHeader === "1";
}
