import { randomUUID } from "node:crypto";
import type { Membership, MembershipPlan, MembershipRepository } from "./payment.types.js";
import { VIP_PRICES } from "./payment.types.js";

export class MembershipService {
  constructor(
    private readonly membershipRepo: MembershipRepository,
  ) {}

  /** Calculate membership price by plan */
  getPrice(plan: MembershipPlan): number {
    return VIP_PRICES[plan];
  }

  /** Get the expiry timestamp for a plan starting now */
  getExpireAt(plan: MembershipPlan): number {
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    switch (plan) {
      case "monthly": return now + 30 * DAY_MS;
      case "quarterly": return now + 90 * DAY_MS;
      case "yearly": return now + 365 * DAY_MS;
    }
  }

  /** Check if user currently has an active membership */
  async isVip(userId: string): Promise<boolean> {
    const active = await this.membershipRepo.getActiveByUserId(userId);
    return active !== null;
  }

  /** Get active membership or null */
  async getActiveMembership(userId: string): Promise<Membership | null> {
    return this.membershipRepo.getActiveByUserId(userId);
  }

  /** Purchase a membership plan */
  async purchaseMembership(userId: string, plan: MembershipPlan): Promise<Membership> {
    const startAt = Date.now();
    const membership: Membership = {
      id: randomUUID(),
      userId,
      plan,
      startAt,
      expireAt: this.getExpireAt(plan),
      createdAt: startAt,
      updatedAt: startAt,
    };
    return this.membershipRepo.create(membership);
  }

  /** Get membership history */
  async getHistory(userId: string): Promise<Membership[]> {
    return this.membershipRepo.getByUserId(userId);
  }
}
