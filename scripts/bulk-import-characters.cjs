/**
 * scripts/bulk-import-characters.cjs
 * 叙境 官方角色批量导入 — 严格按分级规则
 *
 * 用法：
 *   $env:DATABASE_URL="..." ; node scripts/bulk-import-characters.cjs
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("../node_modules/pg");

const ROOT = path.resolve(__dirname, "..");
const JSON_DIR = path.join(ROOT, "characters-import", "json");
const IMAGE_DIR = path.join(ROOT, "characters-import", "images");
const PUBLIC_CHARS_DIR = path.join(ROOT, "public", "characters");

const OFFICIAL_EMAIL = "official@narraverse.ai";
const OFFICIAL_NAME = "叙境官方";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ═══════════════════════════════════════════════════════════
// 角色分级表 — 按文件名（不含扩展名）匹配
// ═══════════════════════════════════════════════════════════
const TIER_TABLE = {
  "橘光":       { price_star: 0,   rarity: "normal", tags: [],               in_marketplace: false },
  "雫崎富香":   { price_star: 0,   rarity: "normal", tags: [],               in_marketplace: false },
  "一之濑明日奈": { price_star: 490, rarity: "rare", tags: ["rare"],     in_marketplace: true },
  "鸢尾花":     { price_star: 490, rarity: "rare", tags: ["rare"],     in_marketplace: true },
  "Emma":      { price_star: 990, rarity: "epic",   tags: ["epic","rare"], in_marketplace: true },
  // 艾莉娅和阿米莉亚 — 孪生姐妹，合并为同一张角色卡
  "艾莉娅和阿米莉亚": { price_star: 990, rarity: "epic",   tags: ["epic","rare"], in_marketplace: true },
};

// ═══════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════

function findImage(baseName) {
  if (!fs.existsSync(IMAGE_DIR)) return null;
  for (const ext of [".png", ".jpg", ".jpeg", ".webp", ".gif"]) {
    const p = path.join(IMAGE_DIR, baseName + ext);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function copyImageToPublic(srcPath) {
  if (!fs.existsSync(PUBLIC_CHARS_DIR)) fs.mkdirSync(PUBLIC_CHARS_DIR, { recursive: true });
  const dest = path.join(PUBLIC_CHARS_DIR, path.basename(srcPath));
  fs.copyFileSync(srcPath, dest);
  return "/characters/" + path.basename(srcPath);
}

function parseJson(raw) {
  const json = JSON.parse(raw);

  // Tavern Card V2
  if (json.spec === "chara_card_v2" && json.data) {
    const d = json.data;
    return {
      name: d.name || "",
      description: d.description || "",
      personality: d.personality || "",
      first_mes: d.first_mes || "",
      scenario: d.scenario || "",
      system_prompt: d.system_prompt || "",
      tags: d.tags || [],
    };
  }

  // Flat / Chub format — data at top level
  if (json.data && typeof json.data === "object" && !json.spec) {
    const d = json.data;
    return {
      name: d.name || "",
      description: d.description || "",
      personality: d.personality || "",
      first_mes: d.first_mes || "",
      scenario: d.scenario || "",
      system_prompt: d.system_prompt || "",
      tags: d.tags || [],
    };
  }

  // Bare format
  return {
    name: json.name || "",
    description: json.description || "",
    personality: json.personality || "",
    first_mes: json.first_mes || "",
    scenario: json.scenario || "",
    system_prompt: json.system_prompt || "",
    tags: json.tags || [],
  };
}

async function ensureOfficialUser() {
  const u = await pool.query("SELECT id FROM users WHERE email = $1", [OFFICIAL_EMAIL]);
  if (u.rows.length > 0) {
    await pool.query("UPDATE users SET name = $1, is_admin = true WHERE id = $2", [OFFICIAL_NAME, u.rows[0].id]);
    return u.rows[0].id;
  }
  const r = await pool.query(
    "INSERT INTO users (email, name, is_admin) VALUES ($1, $2, true) RETURNING id",
    [OFFICIAL_EMAIL, OFFICIAL_NAME]
  );
  return r.rows[0].id;
}

/**
 * 插入一个角色（使用文件名作为 display_name，JSON 原始 name 保留给模型）
 * @param {string} userId
 * @param {object} card - 解析后的 JSON 数据
 * @param {object} tier - 分级配置
 * @param {string} displayName - 用于前端展示的中文名
 * @param {string} avatarUrl - 图片 URL
 */
async function upsertCharacter(userId, card, tier, displayName, avatarUrl) {
  const officialName = displayName; // characters.name = 中文名（用于唯一约束）

  const r = await pool.query(
    `INSERT INTO characters (
      user_id, name, display_name,
      persona, description, display_description,
      avatar, tier, rarity, price_star,
      speech_style, background, greeting, opening_message,
      world_view, taboos,
      is_verified, is_official, is_free, in_marketplace
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
    ON CONFLICT (name, is_official) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      display_name = EXCLUDED.display_name,
      persona = EXCLUDED.persona,
      description = EXCLUDED.description,
      display_description = EXCLUDED.display_description,
      avatar = EXCLUDED.avatar,
      tier = EXCLUDED.tier,
      rarity = EXCLUDED.rarity,
      price_star = EXCLUDED.price_star,
      speech_style = EXCLUDED.speech_style,
      background = EXCLUDED.background,
      greeting = EXCLUDED.greeting,
      opening_message = EXCLUDED.opening_message,
      world_view = EXCLUDED.world_view,
      taboos = EXCLUDED.taboos,
      is_free = EXCLUDED.is_free,
      in_marketplace = EXCLUDED.in_marketplace,
      updated_at = now()
    RETURNING id`,
    [
      userId,
      officialName,                            // name — 中文名
      displayName,                             // display_name
      card.personality,                        // persona
      card.description,                        // description (原始)
      card.personality || card.description,    // display_description
      avatarUrl,                               // avatar
      "rare",                               // tier
      tier.rarity,                             // rarity
      tier.price_star,                         // price_star
      card.personality,                        // speech_style
      card.description,                        // background
      card.first_mes,                          // greeting
      card.first_mes,                          // opening_message
      card.scenario || "",                     // world_view
      "",                                      // taboos
      true,                                    // is_verified
      true,                                    // is_official
      tier.price_star === 0,                   // is_free
      tier.in_marketplace,                     // in_marketplace
    ]
  );
  return r.rows[0].id;
}

async function upsertMarketplace(charId, userId, tier) {
  if (!tier.in_marketplace) return;
  await pool.query(
    `INSERT INTO character_marketplace (character_id, creator_id, price, status, tags)
     VALUES ($1, $2, $3, 'active', $4)
     ON CONFLICT (character_id) DO UPDATE SET
       price = EXCLUDED.price, status = 'active',
       tags = EXCLUDED.tags, updated_at = now()`,
    [charId, userId, tier.price_star, tier.tags]
  );
}

// ═══════════════════════════════════════════════════════════
// 主流程
// ═══════════════════════════════════════════════════════════

(async () => {
  console.log("\n叙境 官方角色导入\n");

  if (!fs.existsSync(JSON_DIR)) {
    console.error("错误: characters-import/json/ 目录不存在");
    process.exit(1);
  }

  const files = fs.readdirSync(JSON_DIR).filter(f => f.endsWith(".json"));
  if (files.length === 0) {
    console.log("没有 .json 文件。\n");
    await pool.end();
    process.exit(0);
  }

  const userId = await ensureOfficialUser();
  console.log("官方用户 ID: " + userId + "\n");

  let ok = 0, skip = 0, err = 0;

  for (const file of files) {
    const filePath = path.join(JSON_DIR, file);
    const baseName = path.basename(file, ".json"); // e.g. "橘光", "艾莉娅和阿米莉亚"
    console.log("── " + file + " ──");

    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const card = parseJson(raw);

      if (!card.name && !baseName) {
        console.log("  [skip] 缺少 name");
        skip++; continue;
      }

      const names = [baseName];

      for (const charName of names) {
        const tier = TIER_TABLE[charName];
        if (!tier) {
          console.log("  [skip] " + charName + " — 分级表中未找到");
          skip++; continue;
        }

        // 图片匹配：用原始文件名查找
        const imgPath = findImage(baseName);
        const avatarUrl = imgPath ? copyImageToPublic(imgPath) : "✨";
        if (imgPath) console.log("  [image] " + path.basename(imgPath) + " → " + avatarUrl);

        const charId = await upsertCharacter(userId, card, tier, charName, avatarUrl);
        await upsertMarketplace(charId, userId, tier);

        const label = tier.price_star === 0 ? "normal (free)" :
                      tier.price_star === 490 ? "490 rare" : "990 epic";
        console.log("  [OK] " + charName + " → " + label + " | tags: [" + tier.tags.join(", ") + "]");
        ok++;
      }
    } catch (e) {
      console.error("  [ERROR] " + e.message);
      err++;
    }
  }

  console.log("\n════════════════════════");
  console.log("  成功: " + ok + "  跳过: " + skip + "  错误: " + err);
  console.log("════════════════════════\n");

  await pool.end();
})();