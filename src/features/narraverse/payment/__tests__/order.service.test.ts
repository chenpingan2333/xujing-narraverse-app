import { describe, it, expect, beforeEach } from "vitest";
import { OrderService } from "../order.service.js";
import { InMemoryOrderRepository } from "../payment.repos.testdoubles.js";

describe("OrderService", () => {
  let repo: InMemoryOrderRepository;
  let service: OrderService;

  beforeEach(() => {
    repo = new InMemoryOrderRepository();
    service = new OrderService(repo);
  });

  it("creates a pending order", async () => {
    const order = await service.createOrder("u1", "character", 490, "char-1");

    expect(order.userId).toBe("u1");
    expect(order.orderType).toBe("character");
    expect(order.amount).toBe(490);
    expect(order.status).toBe("pending");
    expect(order.targetId).toBe("char-1");
  });

  it("marks order as paid", async () => {
    const order = await service.createOrder("u1", "world_package", 990, "wp-1");
    const paid = await service.markPaid(order.id);

    expect(paid.status).toBe("paid");
  });

  it("throws when marking non-pending order as paid", async () => {
    const order = await service.createOrder("u1", "character", 490, "char-1");
    await service.markPaid(order.id);

    await expect(service.markPaid(order.id)).rejects.toThrow("not in pending status");
  });

  it("cancels an order", async () => {
    const order = await service.createOrder("u1", "membership_monthly", 2990, null);
    const cancelled = await service.cancelOrder(order.id);

    expect(cancelled.status).toBe("cancelled");
  });

  it("returns null for non-existent order", async () => {
    const order = await service.getOrder("nonexistent");
    expect(order).toBeNull();
  });

  it("gets user orders with both expected amounts", async () => {
    await service.createOrder("u1", "character", 490, "c1");
    await service.createOrder("u1", "world_package", 990, "w1");

    const orders = await service.getUserOrders("u1");
    expect(orders).toHaveLength(2);
    const amounts = orders.map((o) => o.amount).sort((a, b) => b - a);
    expect(amounts).toEqual([990, 490]);
  });

  it("stores different order types correctly", async () => {
    const types = [
      "character" as const,
      "world_package" as const,
      "membership_monthly" as const,
      "membership_quarterly" as const,
      "membership_yearly" as const,
    ];

    for (const t of types) {
      const order = await service.createOrder("u1", t, 100, null);
      expect(order.orderType).toBe(t);
    }

    const orders = await service.getUserOrders("u1");
    expect(orders).toHaveLength(5);
  });
});
