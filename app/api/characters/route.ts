import { NextRequest, NextResponse } from "next/server";

interface Character {
  id: string;
  name: string;
  persona: string;
  description: string;
  tier: string;
  worldId: string | null;
  avatar: string;
  relationship?: { affection: number; trust: number; intimacy: number };
}

const characters = new Map<string, Character>();

(function seed() {
  const defaults: Character[] = [
    { id: "char-001", name: "艾琳", persona: "温柔体贴的邻家女孩，喜欢分享日常生活中的小确幸", description: "你的贴心伙伴，总是能在你需要的时候给你温暖", tier: "basic", worldId: null, avatar: "🌸", relationship: { affection: 65, trust: 70, intimacy: 55 } },
    { id: "char-002", name: "雷恩", persona: "勇敢正直的冒险者，总能在危险中保护你", description: "可靠的冒险伙伴，剑术精湛，从不退缩", tier: "premium", worldId: null, avatar: "⚔️", relationship: { affection: 50, trust: 60, intimacy: 40 } },
    { id: "char-003", name: "墨夜", persona: "神秘高冷的剑客，话不多但每句都有深意", description: "故事级角色，拥有完整背景故事与隐藏身份", tier: "story", worldId: null, avatar: "🌙", relationship: { affection: 30, trust: 35, intimacy: 25 } },
  ];
  for (const c of defaults) characters.set(c.id, c);
})();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    const c = characters.get(id);
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(c);
  }
  return NextResponse.json([...characters.values()]);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = `char-${Date.now()}`;
    const character: Character = {
      id,
      name: body.name ?? "未命名角色",
      persona: body.persona ?? "",
      description: body.description ?? "",
      tier: body.tier ?? "basic",
      worldId: body.worldId ?? null,
      avatar: body.avatar ?? "✨",
    };
    characters.set(id, character);
    return NextResponse.json(character, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}