const { Pool } = require("pg");
const p = new Pool({ connectionString: "postgresql://neondb_owner:npg_jiKtahdMB63Q@ep-falling-meadow-aop6zprt-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require", ssl: { rejectUnauthorized: false } });
async function run() {
  // 1. List all characters before cleanup
  const all = await p.query("SELECT id, name, is_official, rarity FROM characters ORDER BY name");
  console.log("BEFORE:", JSON.stringify(all.rows));
  
  // 2. Nuke non-official characters
  const del = await p.query("DELETE FROM characters WHERE is_official = false OR name NOT IN ('橘光','雫崎富香','一之濑明日奈','鸢尾花','Emma','艾莉娅和阿米莉亚')");
  console.log("Deleted non-official chars:", del.rowCount);
  
  // 3. Clean up orphan marketplace entries
  await p.query("DELETE FROM character_marketplace WHERE character_id NOT IN (SELECT id FROM characters)");
  
  // 4. Clean up orphan user_characters
  await p.query("DELETE FROM user_characters WHERE character_id NOT IN (SELECT id FROM characters)");
  
  // 5. Verify final state
  const final = await p.query("SELECT id, name, is_official, rarity FROM characters ORDER BY rarity, name");
  console.log("\nAFTER:", JSON.stringify(final.rows));
  
  // 6. Ensure marketplace has all 4 paid characters
  const paid = await p.query("SELECT id, name, rarity FROM characters WHERE price_star > 0 AND is_official=true");
  console.log("\nPAID CHARS:", JSON.stringify(paid.rows));
  for (const c of paid.rows) {
    await p.query("INSERT INTO character_marketplace (character_id, creator_id, price, status, listed_at) SELECT $1, id, $2, 'active', now() FROM users WHERE email='zzx2975366562@gmail.com' ON CONFLICT (character_id) DO UPDATE SET status='active'", [c.id, c.rarity === 'rare' ? 490 : 990]);
  }
  
  await p.end();
  console.log("\nCLEANUP COMPLETE");
}
run().catch(e=>{console.error(e.message);process.exit(1)});