import { NextRequest, NextResponse } from "next/server";

interface WorldDisplay {
  id: string;
  name: string;
  tier: string;
  worldType: string;
  mode: "simple" | "advanced";
  description: string;
}

const worlds: WorldDisplay[] = [
  { id: "world-001", name: "艾尔德兰", worldType: "fantasy", tier: "basic", mode: "simple", description: "经典西方奇幻世界，剑与魔法的冒险" },
  { id: "world-002", name: "星辰纪元", worldType: "scifi", tier: "premium", mode: "advanced", description: "未来星际文明，人类在银河系中探索未知" },
  { id: "world-003", name: "江湖风云", worldType: "wuxia", tier: "story", mode: "advanced", description: "武侠世界，恩怨情仇，快意江湖" },
];

export async function GET() {
  return NextResponse.json(worlds);
}