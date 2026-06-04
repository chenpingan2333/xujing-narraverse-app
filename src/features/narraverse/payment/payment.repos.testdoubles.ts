import type {
  Wallet,
  WalletRepository,
  Transaction,
  TransactionRepository,
  Membership,
  MembershipRepository,
  Order,
  OrderRepository,
  OrderStatus,
  CreatorDiamondLog,
  CreatorDiamondRepository,
} from "./payment.types.js";

export class InMemoryWalletRepository implements WalletRepository {
  private wallets = new Map<string, Wallet>();

  getByUserId(userId: string): Promise<Wallet | null> {
    for (const w of this.wallets.values()) {
      if (w.userId === userId) return Promise.resolve({ ...w });
    }
    return Promise.resolve(null);
  }

  create(wallet: Wallet): Promise<Wallet> {
    this.wallets.set(wallet.id, { ...wallet });
    return Promise.resolve(wallet);
  }

  async updateBalance(
    userId: string,
    starDelta: number,
    creatorDelta: number,
  ): Promise<Wallet> {
    const wallet = await this.getByUserId(userId);
    if (!wallet) throw new Error(`Wallet not found for user ${userId}`);
    wallet.starDiamonds += starDelta;
    wallet.creatorDiamonds += creatorDelta;
    wallet.updatedAt = Date.now();
    this.wallets.set(wallet.id, wallet);
    return { ...wallet };
  }

  clear(): void {
    this.wallets.clear();
  }
}

export class InMemoryTransactionRepository implements TransactionRepository {
  private transactions: Transaction[] = [];

  save(tx: Transaction): Promise<Transaction> {
    this.transactions.push({ ...tx });
    return Promise.resolve(tx);
  }

  getByUserId(userId: string, limit = 50): Promise<Transaction[]> {
    return Promise.resolve(
      this.transactions
        .filter((t) => t.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit),
    );
  }

  clear(): void {
    this.transactions = [];
  }
}

export class InMemoryMembershipRepository implements MembershipRepository {
  private memberships: Membership[] = [];

  getActiveByUserId(userId: string): Promise<Membership | null> {
    const now = Date.now();
    const active = this.memberships
      .filter((m) => m.userId === userId && m.expireAt > now)
      .sort((a, b) => b.expireAt - a.expireAt);
    return Promise.resolve(active.length > 0 ? { ...active[0] } : null);
  }

  create(membership: Membership): Promise<Membership> {
    this.memberships.push({ ...membership });
    return Promise.resolve(membership);
  }

  getByUserId(userId: string): Promise<Membership[]> {
    return Promise.resolve(
      this.memberships
        .filter((m) => m.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt),
    );
  }

  clear(): void {
    this.memberships = [];
  }
}

export class InMemoryOrderRepository implements OrderRepository {
  private orders: Order[] = [];

  save(order: Order): Promise<Order> {
    this.orders.push({ ...order });
    return Promise.resolve(order);
  }

  getById(orderId: string): Promise<Order | null> {
    const order = this.orders.find((o) => o.id === orderId);
    return Promise.resolve(order ? { ...order } : null);
  }

  getByUserId(userId: string): Promise<Order[]> {
    return Promise.resolve(
      this.orders
        .filter((o) => o.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt),
    );
  }

  updateStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) throw new Error(`Order not found: ${orderId}`);
    order.status = status;
    order.updatedAt = Date.now();
    return Promise.resolve({ ...order });
  }

  clear(): void {
    this.orders = [];
  }
}

export class InMemoryCreatorDiamondRepository implements CreatorDiamondRepository {
  private logs: CreatorDiamondLog[] = [];

  saveLog(log: CreatorDiamondLog): Promise<CreatorDiamondLog> {
    this.logs.push({ ...log });
    return Promise.resolve(log);
  }

  getByCreatorId(creatorId: string): Promise<CreatorDiamondLog[]> {
    return Promise.resolve(
      this.logs
        .filter((l) => l.creatorId === creatorId)
        .sort((a, b) => b.createdAt - a.createdAt),
    );
  }

  clear(): void {
    this.logs = [];
  }
}
