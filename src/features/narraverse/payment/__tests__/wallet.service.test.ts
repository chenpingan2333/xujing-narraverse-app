import { describe, it, expect, beforeEach } from "vitest";
import { WalletService } from "../wallet.service.js";
import { InMemoryWalletRepository, InMemoryTransactionRepository } from "../payment.repos.testdoubles.js";

describe("WalletService", () => {
  let walletRepo: InMemoryWalletRepository;
  let txRepo: InMemoryTransactionRepository;
  let service: WalletService;

  beforeEach(() => {
    walletRepo = new InMemoryWalletRepository();
    txRepo = new InMemoryTransactionRepository();
    service = new WalletService(walletRepo, txRepo);
  });

  it("creates a wallet on first access", async () => {
    const wallet = await service.getWallet("u1");
    expect(wallet.userId).toBe("u1");
    expect(wallet.starDiamonds).toBe(0);
    expect(wallet.creatorDiamonds).toBe(0);
  });

  it("returns existing wallet on second access", async () => {
    const w1 = await service.getWallet("u1");
    const w2 = await service.getWallet("u1");
    expect(w2.id).toBe(w1.id);
  });

  it("adds star diamonds (充值)", async () => {
    await service.getWallet("u1");
    const { wallet, transaction } = await service.addStarDiamonds("u1", 1000);

    expect(wallet.starDiamonds).toBe(1000);
    expect(transaction.type).toBe("deposit");
    expect(transaction.amount).toBe(1000);
    expect(transaction.currency).toBe("star");
    expect(transaction.balanceBefore).toBe(0);
    expect(transaction.balanceAfter).toBe(1000);
  });

  it("rejects negative amount for deposit", async () => {
    await service.getWallet("u1");
    await expect(service.addStarDiamonds("u1", -100)).rejects.toThrow("Amount must be positive");
  });

  it("rejects zero amount for deposit", async () => {
    await service.getWallet("u1");
    await expect(service.addStarDiamonds("u1", 0)).rejects.toThrow("Amount must be positive");
  });

  it("consumes star diamonds (消费)", async () => {
    await service.getWallet("u1");
    await service.addStarDiamonds("u1", 2000);

    const { wallet, transaction } = await service.consumeStarDiamonds(
      "u1", 500, "character_purchase", "char-1", "购买角色 char-1",
    );

    expect(wallet.starDiamonds).toBe(1500);
    expect(transaction.type).toBe("character_purchase");
    expect(transaction.amount).toBe(500);
    expect(transaction.balanceBefore).toBe(2000);
    expect(transaction.balanceAfter).toBe(1500);
  });

  it("throws on insufficient balance for consume", async () => {
    await service.getWallet("u1");
    await expect(
      service.consumeStarDiamonds("u1", 100, "consume", null, "test"),
    ).rejects.toThrow("Insufficient star diamonds");
  });

  it("records transaction history", async () => {
    await service.getWallet("u1");
    await service.addStarDiamonds("u1", 500);
    await service.addStarDiamonds("u1", 300);

    const txs = await service.getTransactions("u1");
    expect(txs).toHaveLength(2);
    // Both recorded, order depends on sort stability — verify both amounts exist
    const amounts = txs.map((t) => t.amount).sort((a, b) => b - a);
    expect(amounts).toEqual([500, 300]);
  });

  it("limits transaction history", async () => {
    await service.getWallet("u1");
    for (let i = 0; i < 5; i++) {
      await service.addStarDiamonds("u1", 100);
    }

    const txs = await service.getTransactions("u1", 3);
    expect(txs).toHaveLength(3);
  });
});
