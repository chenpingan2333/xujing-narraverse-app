import { randomUUID } from "node:crypto";
import type { Wallet, WalletRepository, Transaction, TransactionRepository } from "./payment.types.js";

export class WalletService {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly txRepo: TransactionRepository,
  ) {}

  /** Get or create wallet for a user */
  async getWallet(userId: string): Promise<Wallet> {
    let wallet = await this.walletRepo.getByUserId(userId);
    if (!wallet) {
      wallet = await this.walletRepo.create({
        id: randomUUID(),
        userId,
        starDiamonds: 0,
        creatorDiamonds: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    return wallet;
  }

  /** Add star diamonds (充值) */
  async addStarDiamonds(userId: string, amount: number): Promise<{ wallet: Wallet; transaction: Transaction }> {
    if (amount <= 0) throw new Error("Amount must be positive");

    const wallet = await this.getWallet(userId);
    const balanceBefore = wallet.starDiamonds;
    const updated = await this.walletRepo.updateBalance(userId, amount, 0);

    const tx: Transaction = {
      id: randomUUID(),
      userId,
      type: "deposit",
      amount,
      currency: "star",
      balanceBefore,
      balanceAfter: updated.starDiamonds,
      referenceId: null,
      description: `充值 ${amount} 星钻`,
      createdAt: Date.now(),
    };
    await this.txRepo.save(tx);

    return { wallet: updated, transaction: tx };
  }

  /** Consume star diamonds (消费星钻) */
  async consumeStarDiamonds(
    userId: string,
    amount: number,
    type: Transaction["type"],
    referenceId: string | null,
    description: string,
  ): Promise<{ wallet: Wallet; transaction: Transaction }> {
    if (amount <= 0) throw new Error("Amount must be positive");

    const wallet = await this.getWallet(userId);
    if (wallet.starDiamonds < amount) {
      throw new Error(`Insufficient star diamonds: need ${amount}, have ${wallet.starDiamonds}`);
    }

    const balanceBefore = wallet.starDiamonds;
    const updated = await this.walletRepo.updateBalance(userId, -amount, 0);

    const tx: Transaction = {
      id: randomUUID(),
      userId,
      type,
      amount,
      currency: "star",
      balanceBefore,
      balanceAfter: updated.starDiamonds,
      referenceId,
      description,
      createdAt: Date.now(),
    };
    await this.txRepo.save(tx);

    return { wallet: updated, transaction: tx };
  }

  /** Get transaction history */
  async getTransactions(userId: string, limit?: number): Promise<Transaction[]> {
    return this.txRepo.getByUserId(userId, limit);
  }
}
