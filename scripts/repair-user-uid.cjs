const { Pool } = require("pg");
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function main() {
  // Fix users with uid_display = NAR_000000 or null
  const bad = await p.query(`SELECT id, email, uid_display FROM users WHERE uid_display IS NULL OR uid_display = 'NAR_000000' ORDER BY created_at ASC`);
  console.log(`Found ${bad.rows.length} users with bad UIDs`);
  let seq = 1;
  // Get max existing UID first
  const maxRow = await p.query(`SELECT MAX(CAST(SUBSTRING(uid_display FROM 5) AS INTEGER)) as mx FROM users WHERE uid_display ~ '^NAR_[0-9]{6}$'`);
  if (maxRow.rows[0]?.mx) seq = parseInt(maxRow.rows[0].mx) + 1;
  for (const u of bad.rows) {
    const uid = "NAR_" + String(seq).padStart(6, "0");
    await p.query("UPDATE users SET uid_display=$1 WHERE id=$2", [uid, u.id]);
    console.log(`${u.email}: ${u.uid_display||"null"} -> ${uid}`);
    seq++;
  }
  console.log("UID repair complete");
  await p.end();
}
main().catch(e=>{console.error(e);process.exit(1)});