import { describe, it, expect, beforeEach } from "vitest";
import { MembershipService } from "../membership.service.js";
import { InMemoryMembershipRepository } from "../payment.repos.testdoubles.js";

describe("MembershipService", () => {
  let repo: InMemoryMembershipRepository;
  let service: MembershipService;

  beforeEach(() => {
    repo = new InMemoryMembershipRepository();
    service = new MembershipService(repo);
  });

  it("returns correct price for monthly plan", () => {
    expect(service.getPrice("monthly")).toBe(2990);
  });

  it("returns correct price for quarterly plan", () => {
    expect(service.getPrice("quarterly")).toBe(6990);
  });

  it("returns correct price for yearly plan", () => {
    expect(service.getPrice("yearly")).toBe(19990);
  });

  it("sets expiry approximately 30 days for monthly", () => {
    const expireAt = service.getExpireAt("monthly");
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    expect(expireAt).toBeGreaterThan(Date.now() + thirtyDaysMs - 1000);
    expect(expireAt).toBeLessThan(Date.now() + thirtyDaysMs + 1000);
  });

  it("sets expiry approximately 90 days for quarterly", () => {
    const expireAt = service.getExpireAt("quarterly");
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    expect(expireAt).toBeGreaterThan(Date.now() + ninetyDaysMs - 1000);
  });

  it("sets expiry approximately 365 days for yearly", () => {
    const expireAt = service.getExpireAt("yearly");
    const yearMs = 365 * 24 * 60 * 60 * 1000;
    expect(expireAt).toBeGreaterThan(Date.now() + yearMs - 1000);
  });

  it("isVip returns false when no active membership", async () => {
    const vip = await service.isVip("u1");
    expect(vip).toBe(false);
  });

  it("isVip returns true after purchase", async () => {
    await service.purchaseMembership("u1", "monthly");
    const vip = await service.isVip("u1");
    expect(vip).toBe(true);
  });

  it("purchases membership with correct plan and expiry", async () => {
    const membership = await service.purchaseMembership("u1", "quarterly");

    expect(membership.userId).toBe("u1");
    expect(membership.plan).toBe("quarterly");
    expect(membership.expireAt).toBeGreaterThan(membership.startAt);
  });

  it("returns active membership", async () => {
    await service.purchaseMembership("u1", "monthly");
    const active = await service.getActiveMembership("u1");
    expect(active).not.toBeNull();
    expect(active?.plan).toBe("monthly");
  });

  it("returns null for expired membership", async () => {
    const repo2 = new InMemoryMembershipRepository();
    await repo2.create({
      id: "m1",
      userId: "u1",
      plan: "monthly",
      startAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
      expireAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
      createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
    });

    const service2 = new MembershipService(repo2);
    const active = await service2.getActiveMembership("u1");
    expect(active).toBeNull();
  });

  it("gets membership history", async () => {
    await service.purchaseMembership("u1", "monthly");
    await service.purchaseMembership("u1", "yearly");

    const history = await service.getHistory("u1");
    expect(history).toHaveLength(2);
    const plans = history.map((m) => m.plan).sort();
    expect(plans).toEqual(["monthly", "yearly"]);
  });
});
