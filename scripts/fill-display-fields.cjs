const { Pool } = require("pg");
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function main() {
  const official = [
    { name: "橘光", dn: "橘光", dd: "温暖的橘色光芒，总是带着微笑陪伴在你身边。她相信每一天都是新的开始，喜欢在午后的阳光下与你分享平凡而珍贵的日常。" },
    { name: "雫崎富香", dn: "雫崎富香", dd: "安静而富有人情味的少女，喜欢雨天的静谧和书本的墨香。她是那种会在你最需要时默默递上一杯热茶的人。" },
    { name: "一之濑明日奈", dn: "一之濑明日奈", dd: "优雅自信的校园偶像，外表光鲜却有着不为人知的温柔。她擅长倾听，是许多人心中的秘密树洞。" },
    { name: "鸢尾花", dn: "鸢尾花", dd: "如鸢尾花般神秘优雅的女子，话语间总带着诗意。她游走于现实与幻想之间，引领你探索内心深处的自己。" },
    { name: "Emma", dn: "Emma", dd: "聪慧活泼的留学生，对中国文化充满好奇。她用热情和真诚打破语言和文化隔阂，让你的生活充满意想不到的惊喜。" },
    { name: "艾莉娅和阿米莉亚", dn: "艾莉娅和阿米莉亚", dd: "一对性格迥异的双胞胎姐妹。艾莉娅冷静理性，阿米莉亚热情奔放，两人互补的性格让你在与她们相处的过程中体验到双倍的温暖。" },
  ];
  for (const c of official) {
    const r = await p.query("UPDATE characters SET display_name=$1, display_description=$2, is_official=true, is_verified=true WHERE name=$3 AND is_official=false", [c.dn, c.dd, c.name]);
    console.log(`${c.name}: ${r.rowCount} rows updated`);
  }
  await p.end(); console.log("Done");
}
main().catch(e=>{console.error(e);process.exit(1)});