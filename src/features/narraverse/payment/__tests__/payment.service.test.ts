import { describe, it, expect } from "vitest";
import { PaymentService } from "../payment.service.js";
import { WalletService } from "../wallet.service.js";
import { MembershipService } from "../membership.service.js";
import { OrderService } from "../order.service.js";
import { CreatorService } from "../creator.service.js";
import {
  InMemoryWalletRepository,
  InMemoryTransactionRepository,
  InMemoryMembershipRepository,
  InMemoryOrderRepository,
  InMemoryCreatorDiamondRepository,
} from "../payment.repos.testdoubles.js";

function createPaymentService() {
  const walletRepo = new InMemoryWalletRepository();
  const txRepo = new InMemoryTransactionRepository();
  const membershipRepo = new InMemoryMembershipRepository();
  const orderRepo = new InMemoryOrderRepository();
  const creatorRepo = new InMemoryCreatorDiamondRepository();

  const walletService = new WalletService(walletRepo, txRepo);
  const membershipService = new MembershipService(membershipRepo);
  const orderService = new OrderService(orderRepo);
  const creatorService = new CreatorService(creatorRepo, walletRepo);

  const paymentService = new PaymentService(
    walletService,
    membershipService,
    orderService,
    creatorService,
  );

  return {
    paymentService,
    walletService,
    membershipService,
    orderService,
    creatorService,
    walletRepo,
  };
}

describe("PaymentService", () => {
  it("purchases membership: deducts diamonds, activates membership, records transaction", async () => {
    const deps = createPaymentService();
    await deps.walletService.getWallet("u1");
    await deps.walletService.addStarDiamonds("u1", 5000);

    const result = await deps.paymentService.purchaseMembership("u1", "monthly");

    expect(result.wallet.starDiamonds).toBe(5000 - 2990);
    expect(result.membership.plan).toBe("monthly");
    expect(result.membership.expireAt).toBeGreaterThan(Date.now());
    expect(result.order.status).toBe("paid");
    expect(result.transaction.type).toBe("membership");
    expect(result.transaction.amount).toBe(2990);

    const isVip = await deps.membershipService.isVip("u1");
    expect(isVip).toBe(true);
  });

  it("throws on insufficient balance for membership purchase", async () => {
    const deps = createPaymentService();
    await deps.walletService.getWallet("u1");

    await expect(
      deps.paymentService.purchaseMembership("u1", "yearly"),
    ).rejects.toThrow("Insufficient star diamonds");
  });

  it("purchases character: deducts buyer, credits creator 70%", async () => {
    const deps = createPaymentService();
    await deps.walletService.getWallet("bu1");
    await deps.walletService.addStarDiamonds("bu1", 2000);
    await deps.walletService.getWallet("cr1");

    const result = await deps.paymentService.purchaseCharacter("bu1", "cr1", "char-x", 990);

    expect(result.wallet.starDiamonds).toBe(2000 - 990);
    expect(result.order.status).toBe("paid");

    const creatorWallet = await deps.walletService.getWallet("cr1");
    expect(creatorWallet.creatorDiamonds).toBe(693);

    const logs = await deps.creatorService.getLogs("cr1");
    expect(logs).toHaveLength(1);
    expect(logs[0].income).toBe(693);
    expect(logs[0].sourceCharacterId).toBe("char-x");
  });

  it("purchases world package: 70/30 split to creator", async () => {
    const deps = createPaymentService();
    await deps.walletService.getWallet("bu2");
    await deps.walletService.addStarDiamonds("bu2", 5000);
    await deps.walletService.getWallet("cr2");

    const result = await deps.paymentService.purchaseWorldPackage("bu2", "cr2", "wp-magic", 1990);

    expect(result.wallet.starDiamonds).toBe(5000 - 1990);
    expect(result.order.status).toBe("paid");

    const creatorWallet = await deps.walletService.getWallet("cr2");
    expect(creatorWallet.creatorDiamonds).toBe(Math.floor(1990 * 0.7));
  });

  it("records correct order status through purchase lifecycle", async () => {
    const deps = createPaymentService();
    await deps.walletService.getWallet("u1");
    await deps.walletService.addStarDiamonds("u1", 10000);

    const result = await deps.paymentService.purchaseMembership("u1", "quarterly");

    expect(result.order.status).toBe("paid");
    expect(result.order.amount).toBe(6990);
  });

  it("creator income records zero on free/zero-price items", async () => {
    const deps = createPaymentService();
    await deps.walletService.getWallet("bu3");
    await deps.walletService.addStarDiamonds("bu3", 100);
    await deps.walletService.getWallet("cr3");

    const result = await deps.paymentService.purchaseCharacter("bu3", "cr3", "free-char", 0);

    const creatorWallet = await deps.walletService.getWallet("cr3");
    expect(creatorWallet.creatorDiamonds).toBe(0);
    expect(result.order.status).toBe("paid");
  });
});
