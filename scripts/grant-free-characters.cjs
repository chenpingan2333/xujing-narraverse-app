const { Pool } = require("pg");
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const FREE_CHARS = ["橘光", "雫崎富香"];
async function main() {
  const users = await p.query("SELECT id FROM users");
  let granted = 0;
  for (const u of users.rows) {
    for (const name of FREE_CHARS) {
      const ch = await p.query("SELECT id FROM characters WHERE name=$1", [name]);
      if (ch.rows.length > 0) {
        await p.query(
          "INSERT INTO user_characters (user_id, character_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
          [u.id, ch.rows[0].id]
        );
      }
    }
    granted++;
  }
  console.log(`Granted free characters to ${granted} users`);
  await p.end();
}
main().catch(e=>{console.error(e);process.exit(1)});