export { runWalletMigration } from "./wallets.js";
export { runTransactionMigration } from "./transactions.js";
export { runMembershipMigration } from "./memberships.js";
export { runOrderMigration } from "./orders.js";
export { runCreatorDiamondMigration } from "./creatorDiamonds.js";

import type { Pool } from "pg";

export async function runAllPaymentMigrations(pool: Pool): Promise<void> {
  const { runWalletMigration } = await import("./wallets.js");
  const { runTransactionMigration } = await import("./transactions.js");
  const { runMembershipMigration } = await import("./memberships.js");
  const { runOrderMigration } = await import("./orders.js");
  const { runCreatorDiamondMigration } = await import("./creatorDiamonds.js");

  await runWalletMigration(pool);
  await runTransactionMigration(pool);
  await runMembershipMigration(pool);
  await runOrderMigration(pool);
  await runCreatorDiamondMigration(pool);
}
