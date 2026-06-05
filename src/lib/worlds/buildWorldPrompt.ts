/**
 * buildWorldPrompt — 统一世界包 Prompt 构建器
 *
 * 输入简单/高级模式配置，输出固定格式的中文世界设定 Prompt。
 */

export interface SimpleWorldConfig {
  type: string;         // 核心类型（如：古风仙侠、赛博朋克、校园日常）
  relation: string;     // 角色关系（如：师徒、青梅竹马、上司与下属）
  address: string;      // 称呼规则（如：叫我师哥就好、请称我为陛下）
  situation: string;    // 当前处境（如：宗门大比前夕、末日降临第三周）
}

export interface AdvancedWorldConfig {
  rules: string[];      // 世界法则（如：灵力至上、科技禁绝情感）
  hierarchy: string;    // 等级体系（如：练气→筑基→金丹→元婴→化神）
  glossary: Record<string, string>; // 词典（如：{"灵力":"世界的本源能量","神识":"精神力扫描"})
  atmosphere: string;   // 环境氛围（如：阴雨连绵的废墟都市）
  taboos: string;       // 文风禁忌（如：避免现代词汇、不可使用英文）
}

export type WorldConfig = SimpleWorldConfig & Partial<AdvancedWorldConfig>;

export function buildWorldPrompt(config: WorldConfig): string {
  const lines: string[] = [];

  lines.push("# 世界设定\n");
  lines.push(`核心类型：${config.type}`);
  lines.push(`角色关系：${config.relation}`);
  lines.push(`称呼规则：${config.address}`);
  lines.push(`当前处境：${config.situation}`);

  // 高级模式字段
  if (config.rules && config.rules.length > 0) {
    lines.push(`世界法则：${config.rules.join("；")}`);
  }
  if (config.hierarchy) {
    lines.push(`等级体系：${config.hierarchy}`);
  }
  if (config.glossary && Object.keys(config.glossary).length > 0) {
    const entries = Object.entries(config.glossary)
      .map(([k, v]) => `"${k}"=${v}`)
      .join("，");
    lines.push(`词典：${entries}`);
  }
  if (config.atmosphere) {
    lines.push(`环境：${config.atmosphere}`);
  }
  if (config.taboos) {
    lines.push(`文风禁忌：${config.taboos}`);
  }

  return lines.join("\n") + "\n";
}