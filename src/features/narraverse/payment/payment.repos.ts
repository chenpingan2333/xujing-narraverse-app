import type { Pool } from "pg";
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

interface WalletRow {
  id: string;
  user_id: string;
  star_diamonds: number;
  creator_diamonds: number;
  created_at: string;
  updated_at: string;
}

export class PostgresWalletRepository implements WalletRepository {
  constructor(private readonly pool: Pool) {}

  async getByUserId(userId: string): Promise<Wallet | null> {
    const result = await this.pool.query<WalletRow>(
      "SELECT * FROM wallets WHERE user_id = $1",
      [userId],
    );
    if (result.rows.length === 0) return null;
    return this.toWallet(result.rows[0]);
  }

  async create(wallet: Wallet): Promise<Wallet> {
    await this.pool.query(
      `INSERT INTO wallets (id, user_id, star_diamonds, creator_diamonds, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [wallet.id, wallet.userId, wallet.starDiamonds, wallet.creatorDiamonds, wallet.createdAt, wallet.updatedAt],
    );
    return wallet;
  }

  async updateBalance(
    userId: string,
    starDelta: number,
    creatorDelta: number,
  ): Promise<Wallet> {
    const result = await this.pool.query<WalletRow>(
      `UPDATE wallets
       SET star_diamonds = star_diamonds + $2,
           creator_diamonds = creator_diamonds + $3,
           updated_at = $4
       WHERE user_id = $1
       RETURNING *`,
      [userId, starDelta, creatorDelta, Date.now()],
    );
    if (result.rows.length === 0) {
      throw new Error(`Wallet not found for user ${userId}`);
    }
    return this.toWallet(result.rows[0]);
  }

  private toWallet(row: WalletRow): Wallet {
    return {
      id: row.id,
      userId: row.user_id,
      starDiamonds: row.star_diamonds,
      creatorDiamonds: row.creator_diamonds,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
    };
  }
}

interface TransactionRow {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  currency: string;
  balance_before: number;
  balance_after: number;
  reference_id: string | null;
  description: string;
  created_at: string;
}

export class PostgresTransactionRepository implements TransactionRepository {
  constructor(private readonly pool: Pool) {}

  async save(tx: Transaction): Promise<Transaction> {
    await this.pool.query(
      `INSERT INTO transactions (id, user_id, type, amount, currency, balance_before, balance_after, reference_id, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [tx.id, tx.userId, tx.type, tx.amount, tx.currency, tx.balanceBefore, tx.balanceAfter, tx.referenceId, tx.description, tx.createdAt],
    );
    return tx;
  }

  async getByUserId(userId: string, limit = 50): Promise<Transaction[]> {
    const result = await this.pool.query<TransactionRow>(
      "SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
      [userId, limit],
    );
    return result.rows.map((r) => this.toTransaction(r));
  }

  private toTransaction(row: TransactionRow): Transaction {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as Transaction["type"],
      amount: row.amount,
      currency: row.currency as Transaction["currency"],
      balanceBefore: row.balance_before,
      balanceAfter: row.balance_after,
      referenceId: row.reference_id,
      description: row.description,
      createdAt: Number(row.created_at),
    };
  }
}

interface MembershipRow {
  id: string;
  user_id: string;
  plan: string;
  start_at: string;
  expire_at: string;
  created_at: string;
  updated_at: string;
}

export class PostgresMembershipRepository implements MembershipRepository {
  constructor(private readonly pool: Pool) {}

  async getActiveByUserId(userId: string): Promise<Membership | null> {
    const now = Date.now();
    const result = await this.pool.query<MembershipRow>(
      "SELECT * FROM memberships WHERE user_id = $1 AND expire_at > $2 ORDER BY expire_at DESC LIMIT 1",
      [userId, now],
    );
    if (result.rows.length === 0) return null;
    return this.toMembership(result.rows[0]);
  }

  async create(membership: Membership): Promise<Membership> {
    await this.pool.query(
      `INSERT INTO memberships (id, user_id, plan, start_at, expire_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [membership.id, membership.userId, membership.plan, membership.startAt, membership.expireAt, membership.createdAt, membership.updatedAt],
    );
    return membership;
  }

  async getByUserId(userId: string): Promise<Membership[]> {
    const result = await this.pool.query<MembershipRow>(
      "SELECT * FROM memberships WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    return result.rows.map((r) => this.toMembership(r));
  }

  private toMembership(row: MembershipRow): Membership {
    return {
      id: row.id,
      userId: row.user_id,
      plan: row.plan as Membership["plan"],
      startAt: Number(row.start_at),
      expireAt: Number(row.expire_at),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
    };
  }
}

interface OrderRow {
  id: string;
  user_id: string;
  order_type: string;
  amount: number;
  status: string;
  target_id: string | null;
  created_at: string;
  updated_at: string;
}

export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly pool: Pool) {}

  async save(order: Order): Promise<Order> {
    await this.pool.query(
      `INSERT INTO orders (id, user_id, order_type, amount, status, target_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [order.id, order.userId, order.orderType, order.amount, order.status, order.targetId, order.createdAt, order.updatedAt],
    );
    return order;
  }

  async getById(orderId: string): Promise<Order | null> {
    const result = await this.pool.query<OrderRow>(
      "SELECT * FROM orders WHERE id = $1",
      [orderId],
    );
    if (result.rows.length === 0) return null;
    return this.toOrder(result.rows[0]);
  }

  async getByUserId(userId: string): Promise<Order[]> {
    const result = await this.pool.query<OrderRow>(
      "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    return result.rows.map((r) => this.toOrder(r));
  }

  async updateStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const result = await this.pool.query<OrderRow>(
      `UPDATE orders SET status = $2, updated_at = $3 WHERE id = $1 RETURNING *`,
      [orderId, status, Date.now()],
    );
    if (result.rows.length === 0) {
      throw new Error(`Order not found: ${orderId}`);
    }
    return this.toOrder(result.rows[0]);
  }

  private toOrder(row: OrderRow): Order {
    return {
      id: row.id,
      userId: row.user_id,
      orderType: row.order_type as Order["orderType"],
      amount: row.amount,
      status: row.status as Order["status"],
      targetId: row.target_id,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
    };
  }
}

interface CreatorDiamondRow {
  id: string;
  creator_id: string;
  source_character_id: string | null;
  source_world_package_id: string | null;
  income: number;
  expense: number;
  description: string;
  created_at: string;
}

export class PostgresCreatorDiamondRepository implements CreatorDiamondRepository {
  constructor(private readonly pool: Pool) {}

  async saveLog(log: CreatorDiamondLog): Promise<CreatorDiamondLog> {
    await this.pool.query(
      `INSERT INTO creator_diamond_logs (id, creator_id, source_character_id, source_world_package_id, income, expense, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [log.id, log.creatorId, log.sourceCharacterId, log.sourceWorldPackageId, log.income, log.expense, log.description, log.createdAt],
    );
    return log;
  }

  async getByCreatorId(creatorId: string): Promise<CreatorDiamondLog[]> {
    const result = await this.pool.query<CreatorDiamondRow>(
      "SELECT * FROM creator_diamond_logs WHERE creator_id = $1 ORDER BY created_at DESC",
      [creatorId],
    );
    return result.rows.map((r) => this.toLog(r));
  }

  private toLog(row: CreatorDiamondRow): CreatorDiamondLog {
    return {
      id: row.id,
      creatorId: row.creator_id,
      sourceCharacterId: row.source_character_id,
      sourceWorldPackageId: row.source_world_package_id,
      income: row.income,
      expense: row.expense,
      description: row.description,
      createdAt: Number(row.created_at),
    };
  }
}
