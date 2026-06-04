import { randomUUID } from "node:crypto";
import type { CreatorDiamondLog, CreatorDiamondRepository, WalletRepository } from "./payment.types.js";

export class CreatorService {
  constructor(
    private readonly creatorRepo: CreatorDiamondRepository,
    private readonly walletRepo: WalletRepository,
  ) {}

  /** Record creator income from a character or world package sale */
  async recordIncome(params: {
    creatorId: string;
    amount: number;
    sourceCharacterId?: string;
    sourceWorldPackageId?: string;
    description: string;
  }): Promise<void> {
    const log: CreatorDiamondLog = {
      id: randomUUID(),
      creatorId: params.creatorId,
      sourceCharacterId: params.sourceCharacterId ?? null,
      sourceWorldPackageId: params.sourceWorldPackageId ?? null,
      income: params.amount,
      expense: 0,
      description: params.description,
      createdAt: Date.now(),
    };
    await this.creatorRepo.saveLog(log);

    // Add creator diamonds to wallet
    await this.walletRepo.updateBalance(params.creatorId, 0, params.amount);
  }

  /** Use creator diamonds to pay for membership */
  async applyCreatorDiamonds(userId: string, amount: number): Promise<void> {
    const wallet = await this.walletRepo.getByUserId(userId);
    if (!wallet) throw new Error(`Wallet not found for user ${userId}`);
    if (wallet.creatorDiamonds < amount) {
      throw new Error(`Insufficient creator diamonds: need ${amount}, have ${wallet.creatorDiamonds}`);
    }

    // Deduct creator diamonds
    await this.walletRepo.updateBalance(userId, 0, -amount);

    const log: CreatorDiamondLog = {
      id: randomUUID(),
      creatorId: userId,
      sourceCharacterId: null,
      sourceWorldPackageId: null,
      income: 0,
      expense: amount,
      description: `使用 ${amount} 创作星钻抵扣会员费用`,
      createdAt: Date.now(),
    };
    await this.creatorRepo.saveLog(log);
  }

  /** Get creator diamond logs */
  async getLogs(creatorId: string): Promise<CreatorDiamondLog[]> {
    return this.creatorRepo.getByCreatorId(creatorId);
  }
}
