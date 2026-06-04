import { randomUUID } from "node:crypto";
import type { Order, OrderRepository, OrderType } from "./payment.types.js";

export class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
  ) {}

  /** Create a new pending order */
  async createOrder(
    userId: string,
    orderType: OrderType,
    amount: number,
    targetId: string | null,
  ): Promise<Order> {
    const now = Date.now();
    const order: Order = {
      id: randomUUID(),
      userId,
      orderType,
      amount,
      status: "pending",
      targetId,
      createdAt: now,
      updatedAt: now,
    };
    return this.orderRepo.save(order);
  }

  /** Mark an order as paid */
  async markPaid(orderId: string): Promise<Order> {
    const order = await this.orderRepo.getById(orderId);
    if (!order) throw new Error(`Order not found: ${orderId}`);
    if (order.status !== "pending") {
      throw new Error(`Order ${orderId} is not in pending status: ${order.status}`);
    }
    return this.orderRepo.updateStatus(orderId, "paid");
  }

  /** Mark an order as cancelled */
  async cancelOrder(orderId: string): Promise<Order> {
    return this.orderRepo.updateStatus(orderId, "cancelled");
  }

  /** Get order by ID */
  async getOrder(orderId: string): Promise<Order | null> {
    return this.orderRepo.getById(orderId);
  }

  /** Get user's orders */
  async getUserOrders(userId: string): Promise<Order[]> {
    return this.orderRepo.getByUserId(userId);
  }
}
