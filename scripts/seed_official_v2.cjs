/**
 * scripts/seed_official_v2.cjs
 * 叙境 Narraverse — 官方角色种子脚本
 *
 * 编码：UTF-8
 * 安全：重复执行安全（UPSERT 逻辑）
 * 自动标记：creator=叙境官方, verified=true, official=true
 *
 * 使用方法：
 *   $env:DATABASE_URL="..." ; node scripts/seed_official_v2.cjs
 *
 * ═══════════════════════════════════════════════════════════
 * 官方角色数据 — 由用户提供，请勿自行生成
 * ═══════════════════════════════════════════════════════════
 * 每个角色需要以下字段：
 *   name        — 角色名称
 *   persona     — 一句话人设
 *   description — 详细描述（段落）
 *   avatar      — 头像文字/emoji
 *   tier        — 品质: basic | premium | story
 *   speechStyle — 说话风格
 *   background  — 背景故事
 *   greeting    — 开场白
 *   taboos      — 禁忌话题
 *   tags        — 标签数组，如 ["古风","武侠"]
 *   relationType — 关系类型
 *   price       — 星钻价格（官方角色默认 990）
 * ═══════════════════════════════════════════════════════════
 */

const { Pool } = require("../node_modules/pg");

// ── Pool ───────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ═══════════════════════════════════════════════════════════
// 官方角色数据 — 请在此处填入角色数据
// 每个角色的 price 字段可选，默认为 990
// ═══════════════════════════════════════════════════════════
const OFFICIAL_CHARACTERS = [
  // 请将你的官方角色数据填入此数组
  // 格式参考文件头部的字段说明
];
// ═══════════════════════════════════════════════════════════

const OFFICIAL_EMAIL = "official@narraverse.ai";
const OFFICIAL_NAME = "叙境官方";
const DEFAULT_PRICE = 990;

// ── Helpers ────────────────────────────────────────────────

async function ensureMigration() {
  await pool.query("ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false");
  await pool.query("ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_official BOOLEAN NOT NULL DEFAULT false");
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_char_name_per_user') THEN
        ALTER TABLE characters ADD CONSTRAINT unique_char_name_per_user UNIQUE (user_id, name);
      END IF;
    END $$;
  `);
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_marketplace_character') THEN
        ALTER TABLE character_marketplace ADD CONSTRAINT unique_marketplace_character UNIQUE (character_id);
      END IF;
    END $$;
  `);
  await pool.query("ALTER TABLE character_marketplace ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'");
  console.log("  [migration] Schema up-to-date");
}

async function ensureOfficialUser() {
  let user = await pool.query("SELECT id FROM users WHERE email = $1", [OFFICIAL_EMAIL]);
  if (user.rows.length > 0) {
    const uid = user.rows[0].id;
    await pool.query("UPDATE users SET name = $1, is_admin = true WHERE id = $2", [OFFICIAL_NAME, uid]);
    console.log("  [user] Official user exists: " + uid);
    return uid;
  }
  const r = await pool.query(
    "INSERT INTO users (email, name, is_admin) VALUES ($1, $2, true) RETURNING id",
    [OFFICIAL_EMAIL, OFFICIAL_NAME]
  );
  console.log("  [user] Created official user: " + r.rows[0].id);
  return r.rows[0].id;
}

async function upsertCharacter(userId, ch) {
  const result = await pool.query(
    `INSERT INTO characters (user_id, name, persona, description, tier, avatar, speech_style, background, greeting, taboos, rarity, price_star, opening_message, relationship_guide, world_view, is_verified, is_official)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, true, true)
     ON CONFLICT (user_id, name) DO UPDATE SET
       persona = EXCLUDED.persona,
       description = EXCLUDED.description,
       tier = EXCLUDED.tier,
       avatar = EXCLUDED.avatar,
       speech_style = EXCLUDED.speech_style,
       background = EXCLUDED.background,
       greeting = EXCLUDED.greeting,
       taboos = EXCLUDED.taboos,
       rarity = EXCLUDED.rarity, price_star = EXCLUDED.price_star, opening_message = EXCLUDED.opening_message, relationship_guide = EXCLUDED.relationship_guide, world_view = EXCLUDED.world_view, is_verified = true,
       is_official = true,
       updated_at = now()
     RETURNING id`,
    [userId, ch.name, ch.persona, ch.description, ch.tier, ch.avatar, ch.speechStyle, ch.background, ch.greeting, ch.taboos, ch.rarity ?? 'premium', ch.price_star ?? 990, ch.openingMessage ?? ch.greeting ?? '', ch.relationshipGuide ?? ch.relationType ?? '', ch.worldView ?? '',
     ]
  );
  return result.rows[0].id;
}

async function upsertMarketplace(charId, userId, ch) {
  const price = ch.price ?? DEFAULT_PRICE;
  const tags = ch.tags ?? [];
  await pool.query(
    `INSERT INTO character_marketplace (character_id, creator_id, price, status, tags)
     VALUES ($1, $2, $3, 'active', $4)
     ON CONFLICT (character_id) DO UPDATE SET
       price = EXCLUDED.price,
       status = 'active',
       tags = EXCLUDED.tags,
       updated_at = now()`,
    [charId, userId, price, tags]
  );
}

// ── Main ───────────────────────────────────────────────────

(async () => {
  console.log("\n叙境 官方角色种子脚本 v2");
  console.log("═══════════════════════════════\n");

  try {
    await ensureMigration();
    const officialUserId = await ensureOfficialUser();

    if (OFFICIAL_CHARACTERS.length === 0) {
      console.log("\n  [skip] OFFICIAL_CHARACTERS 数组为空，没有角色需要写入。");
      console.log("  请在脚本中的 OFFICIAL_CHARACTERS 数组填入官方角色数据后重新运行。\n");
      await pool.end();
      process.exit(0);
    }

    let created = 0, updated = 0;
    for (const ch of OFFICIAL_CHARACTERS) {
      for (const key of ["name", "persona", "description", "tier", "avatar", "speechStyle", "background", "greeting"]) {
        if (!ch[key]) throw new Error(`角色缺少必填字段: ${key} (角色名: ${ch.name ?? "未知"})`);
      }
      if (!ch.tags || !Array.isArray(ch.tags) || ch.tags.length === 0) {
        throw new Error(`角色缺少 tags 数组: ${ch.name}`);
      }

      const existing = await pool.query(
        "SELECT id FROM characters WHERE user_id = $1 AND name = $2",
        [officialUserId, ch.name]
      );
      const isNew = existing.rows.length === 0;

      const charId = await upsertCharacter(officialUserId, ch);
      await upsertMarketplace(charId, officialUserId, ch);

      if (isNew) {
        created++;
        console.log(`  [create] ${ch.name} | tags: [${ch.tags.join(", ")}]`);
      } else {
        updated++;
        console.log(`  [update] ${ch.name} | tags: [${ch.tags.join(", ")}]`);
      }
    }

    console.log("\n═══════════════════════════════");
    console.log(`  新增: ${created}  更新: ${updated}  总计: ${OFFICIAL_CHARACTERS.length}`);
    console.log("═══════════════════════════════\n");
  } catch (e) {
    console.error("\n  [FATAL]", e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();