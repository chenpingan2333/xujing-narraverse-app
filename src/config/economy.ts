// 叙境 — Central Economy Configuration
// ALL prices in star diamonds (星钻). 1 CNY = 100 星钻.

export const ECONOMY = {
  STAR_PER_CNY: 100,
  CNY_SYMBOL: "¥",
  STAR_SYMBOL: "✦",
} as const;

// ─── Membership (星钻) ──────────────────────────────────
export const MEMBERSHIP_PRICES = {
  monthly: 2990,       // ≈ ¥29.9
  monthlyFirst: 990,   // ≈ ¥9.9  新人首月
  quarterly: 7190,     // ≈ ¥71.9  ¥23.9/月
  yearly: 19990,       // ≈ ¥199.9 ¥16.6/月
} as const;

// ─── Recharge Packages (星钻) ───────────────────────────
export const RECHARGE_PACKAGES = [
  { stars: 490, price: 4.9, label: "新人体验包", recommended: false },
  { stars: 990, price: 9.9, label: "基础包", recommended: false },
  { stars: 1990, price: 19.9, label: "热门推荐", recommended: true },
  { stars: 2990, price: 29.9, label: "月卡充值包", recommended: false },
  { stars: 6990, price: 69.9, label: "季卡充值包", recommended: false },
  { stars: 19990, price: 199.9, label: "年卡充值包", recommended: false },
] as const;

// ─── Character Marketplace ───────────────────────────────
export const CHARACTER_PRICES = [490, 990, 1990] as const;

// ─── Creator Revenue Split ───────────────────────────────
export const CREATOR_REVENUE_SPLIT = 0.70;
export const PLATFORM_REVENUE_SPLIT = 0.30;

// ─── Ad Rewards ──────────────────────────────────────────
export const AD_REWARD_CHARACTER = 30;
export const AD_REWARD_CONVERSATION = 50;

// ─── Limits ──────────────────────────────────────────────
export const FREE_CHARACTER_LIMIT = 2;
export const AD_TURN_INTERVAL = 200;
export const FREE_MEMORY_LIMIT = 200;
export const VIP_MEMORY_LIMIT = 10_000;
export const AD_COOLDOWN_SECONDS = 300;

// ─── Helpers ─────────────────────────────────────────────
export function formatStars(stars: number): string {
  return stars + " 星钻";
}

export function formatCNY(stars: number): string {
  return "≈ " + ECONOMY.CNY_SYMBOL + (stars / ECONOMY.STAR_PER_CNY).toFixed(1);
}

export function formatMonthlyCNY(stars: number, months: number): string {
  return "相当于 " + ECONOMY.CNY_SYMBOL + (stars / ECONOMY.STAR_PER_CNY / months).toFixed(1) + "/月";
}
