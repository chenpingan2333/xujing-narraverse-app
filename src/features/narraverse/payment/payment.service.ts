import type { MembershipPlan, Transaction, Wallet, Order } from "./payment.types.js";
import { CREATOR_REVENUE_SPLIT } from "./payment.types.js";
import { WalletService } from "./wallet.service.js";
import { MembershipService } from "./membership.service.js";
import { OrderService } from "./order.service.js";
import { CreatorService } from "./creator.service.js";

export class PaymentService {
  constructor(
    private readonly walletService: WalletService,
    private readonly membershipService: MembershipService,
    private readonly orderService: OrderService,
    private readonly creatorService: CreatorService,
  ) {}

  /** Purchase VIP membership */
  async purchaseMembership(
    userId: string,
    plan: MembershipPlan,
  ): Promise<{
    wallet: Wallet;
    membership: Awaited<ReturnType<MembershipService["purchaseMembership"]>>;
    order: Order;
    transaction: Transaction;
  }> {
    const amount = this.membershipService.getPrice(plan);
    const order = await this.orderService.createOrder(userId, `membership_${plan}`, amount, null);

    const { wallet, transaction } = await this.walletService.consumeStarDiamonds(
      userId,
      amount,
      "membership",
      order.id,
      `购买 ${plan} 会员`,
    );

    const membership = await this.membershipService.purchaseMembership(userId, plan);
    const paidOrder = await this.orderService.markPaid(order.id);

    return { wallet, membership, order: paidOrder, transaction };
  }

  /** Purchase a character — deduct buyer diamonds, split 70/30 to creator */
  async purchaseCharacter(
    buyerId: string,
    creatorId: string,
    characterId: string,
    price: number,
  ): Promise<{
    wallet: Wallet;
    order: Order;
    transaction: Transaction | null;
  }> {
    const order = await this.orderService.createOrder(buyerId, "character", price, characterId);

    let wallet: Wallet;
    let transaction: Transaction | null = null;

    if (price > 0) {
      const result = await this.walletService.consumeStarDiamonds(
        buyerId,
        price,
        "character_purchase",
        order.id,
        `购买角色 ${characterId}`,
      );
      wallet = result.wallet;
      transaction = result.transaction;
    } else {
      wallet = await this.walletService.getWallet(buyerId);
    }

    const creatorShare = Math.floor(price * CREATOR_REVENUE_SPLIT);
    if (creatorShare > 0) {
      await this.creatorService.recordIncome({
        creatorId,
        amount: creatorShare,
        sourceCharacterId: characterId,
        description: `角色 ${characterId} 被购买，创作者分成 ${creatorShare} 星钻`,
      });
    }

    const paidOrder = await this.orderService.markPaid(order.id);
    return { wallet, order: paidOrder, transaction };
  }

  /** Purchase a world package */
  async purchaseWorldPackage(
    buyerId: string,
    creatorId: string,
    worldPackageId: string,
    price: number,
  ): Promise<{
    wallet: Wallet;
    order: Order;
    transaction: Transaction | null;
  }> {
    const order = await this.orderService.createOrder(buyerId, "world_package", price, worldPackageId);

    let wallet: Wallet;
    let transaction: Transaction | null = null;

    if (price > 0) {
      const result = await this.walletService.consumeStarDiamonds(
        buyerId,
        price,
        "world_purchase",
        order.id,
        `购买世界包 ${worldPackageId}`,
      );
      wallet = result.wallet;
      transaction = result.transaction;
    } else {
      wallet = await this.walletService.getWallet(buyerId);
    }

    const creatorShare = Math.floor(price * CREATOR_REVENUE_SPLIT);
    if (creatorShare > 0) {
      await this.creatorService.recordIncome({
        creatorId,
        amount: creatorShare,
        sourceWorldPackageId: worldPackageId,
        description: `世界包 ${worldPackageId} 被购买，创作者分成 ${creatorShare} 星钻`,
      });
    }

    const paidOrder = await this.orderService.markPaid(order.id);
    return { wallet, order: paidOrder, transaction };
  }
}
