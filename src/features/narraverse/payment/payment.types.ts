import { z } from "zod";

// ─── Product Rules (frozen) ─────────────────────────────────────────────────
export const STAR_DIAMOND_RATE = 100; // 1 RMB = 100 星钻

export const VIP_PRICES = {
  monthly: 2990,       // 29.9 RMB
  monthlyFirst: 990,   // 9.9 RMB (first month only)
  quarterly: 6990,     // 23.3 RMB/month
  yearly: 19990,       // 16.6 RMB/month
} as const;

export const CHARACTER_PRICES = {
  basic: 490,
  premium: 990,
  story: 1990,
} as const;

export const WORLD_PACKAGE_PRICES = {
  basic: 490,
  premium: 990,
  story: 1990,
} as const;

export const CREATOR_REVENUE_SPLIT = 0.70; // 70% creator, 30% platform
export const PLATFORM_REVENUE_SPLIT = 0.30;

// ─── Currency ────────────────────────────────────────────────────────────────

export const Currency = z.enum(["star", "creator"]);
export type Currency = z.infer<typeof Currency>;

// ─── Transaction Types ───────────────────────────────────────────────────────

export const TransactionType = z.enum([
  "deposit",
  "consume",
  "membership",
  "character_purchase",
  "world_purchase",
  "creator_income",
  "ad_reward",
  "refund",
]);
export type TransactionType = z.infer<typeof TransactionType>;

// ─── Membership Plans ────────────────────────────────────────────────────────

export const MembershipPlan = z.enum(["monthly", "quarterly", "yearly"]);
export type MembershipPlan = z.infer<typeof MembershipPlan>;

// ─── Order Types ─────────────────────────────────────────────────────────────

export const OrderType = z.enum([
  "character",
  "world_package",
  "membership_monthly",
  "membership_quarterly",
  "membership_yearly",
]);
export type OrderType = z.infer<typeof OrderType>;

// ─── Order Status ────────────────────────────────────────────────────────────

export const OrderStatus = z.enum(["pending", "paid", "cancelled", "refunded"]);
export type OrderStatus = z.infer<typeof OrderStatus>;

// ─── Wallet ──────────────────────────────────────────────────────────────────

export const Wallet = z.object({
  id: z.string(),
  userId: z.string(),
  starDiamonds: z.number().min(0),
  creatorDiamonds: z.number().min(0),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Wallet = z.infer<typeof Wallet>;

// ─── Transaction ─────────────────────────────────────────────────────────────

export const Transaction = z.object({
  id: z.string(),
  userId: z.string(),
  type: TransactionType,
  amount: z.number(),
  currency: Currency,
  balanceBefore: z.number(),
  balanceAfter: z.number(),
  referenceId: z.string().nullable(),
  description: z.string(),
  createdAt: z.number(),
});
export type Transaction = z.infer<typeof Transaction>;

// ─── Membership ──────────────────────────────────────────────────────────────

export const Membership = z.object({
  id: z.string(),
  userId: z.string(),
  plan: MembershipPlan,
  startAt: z.number(),
  expireAt: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Membership = z.infer<typeof Membership>;

// ─── Order ───────────────────────────────────────────────────────────────────

export const Order = z.object({
  id: z.string(),
  userId: z.string(),
  orderType: OrderType,
  amount: z.number(),
  status: OrderStatus,
  targetId: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Order = z.infer<typeof Order>;

// ─── Creator Diamond Log ─────────────────────────────────────────────────────

export const CreatorDiamondLog = z.object({
  id: z.string(),
  creatorId: z.string(),
  sourceCharacterId: z.string().nullable(),
  sourceWorldPackageId: z.string().nullable(),
  income: z.number().min(0),
  expense: z.number().min(0),
  description: z.string(),
  createdAt: z.number(),
});
export type CreatorDiamondLog = z.infer<typeof CreatorDiamondLog>;

// ─── Repository Interfaces ───────────────────────────────────────────────────

export interface WalletRepository {
  getByUserId(userId: string): Promise<Wallet | null>;
  create(wallet: Wallet): Promise<Wallet>;
  updateBalance(
    userId: string,
    starDelta: number,
    creatorDelta: number,
  ): Promise<Wallet>;
}

export interface TransactionRepository {
  save(tx: Transaction): Promise<Transaction>;
  getByUserId(userId: string, limit?: number): Promise<Transaction[]>;
}

export interface MembershipRepository {
  getActiveByUserId(userId: string): Promise<Membership | null>;
  create(membership: Membership): Promise<Membership>;
  getByUserId(userId: string): Promise<Membership[]>;
}

export interface OrderRepository {
  save(order: Order): Promise<Order>;
  getById(orderId: string): Promise<Order | null>;
  getByUserId(userId: string): Promise<Order[]>;
  updateStatus(orderId: string, status: OrderStatus): Promise<Order>;
}

export interface CreatorDiamondRepository {
  saveLog(log: CreatorDiamondLog): Promise<CreatorDiamondLog>;
  getByCreatorId(creatorId: string): Promise<CreatorDiamondLog[]>;
}
