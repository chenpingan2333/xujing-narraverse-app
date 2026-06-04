"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSession, getInviteStatus } from "@/lib/auth";
import { apiGet, apiPost } from "@/lib/api";
import type { SessionUser } from "@/lib/auth";

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

export default function CharactersPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", persona: "", description: "", tier: "basic", avatar: "✨" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function init() {
      const session = await getSession();
      if (!session?.user) { router.replace("/login"); return; }
      const status = await getInviteStatus();
      if (!status.invited) { router.replace("/invite-waiting"); return; }
      setUser(session.user);

      try {
        const data = await apiGet<Character[]>("/api/characters");
        setCharacters(data);
      } catch { /* empty */ }
      setLoading(false);
    }
    init();
  }, [router]);

  const handleCreate = useCallback(async () => {
    if (!form.name.trim() || !form.persona.trim()) return;
    setCreating(true);
    try {
      const created = await apiPost<Character>("/api/characters", {
        name: form.name.trim(),
        persona: form.persona.trim(),
        description: form.description.trim(),
        tier: form.tier,
        avatar: form.avatar,
      });
      setCharacters((prev) => [...prev, created]);
      setShowCreate(false);
      setForm({ name: "", persona: "", description: "", tier: "basic", avatar: "✨" });
    } catch { /* show error */ }
    finally { setCreating(false); }
  }, [form]);

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-paper">
        <p className="text-ink-muted text-sm">加载中……</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-paper-border">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/chat")} className="text-ink-muted hover:text-ink transition-colors">
            ← 返回
          </button>
          <h1 className="text-lg font-serif text-ink">角色</h1>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-warm h-9 px-4 text-sm">
          + 创建角色
        </button>
      </header>

      {/* Create form */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-paper rounded-card border border-paper-border p-6 w-full max-w-md shadow-xl animate-soft-fade-in">
            <h2 className="text-base font-serif text-ink mb-4">创建新角色</h2>
            <div className="space-y-3">
              <input
                placeholder="角色名"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input-warm w-full"
              />
              <input
                placeholder="角色描述 (persona)"
                value={form.persona}
                onChange={(e) => setForm((f) => ({ ...f, persona: e.target.value }))}
                className="input-warm w-full"
              />
              <input
                placeholder="简介 (可选)"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="input-warm w-full"
              />
              <div className="flex gap-3">
                <select
                  value={form.tier}
                  onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))}
                  className="input-warm flex-1"
                >
                  <option value="basic">基础</option>
                  <option value="premium">高级</option>
                  <option value="story">故事</option>
                </select>
                <input
                  placeholder="头像 emoji"
                  value={form.avatar}
                  maxLength={8}
                  onChange={(e) => setForm((f) => ({ ...f, avatar: e.target.value }))}
                  className="input-warm w-20 text-center"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1 h-10">
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.name.trim() || !form.persona.trim()}
                className="btn-warm flex-1 h-10"
              >
                {creating ? "创建中……" : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Character grid */}
      <div className="p-6">
        {characters.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-ink-muted text-sm">还没有角色，创建一个吧 ✨</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.map((char) => (
              <button
                key={char.id}
                onClick={() => router.push(`/chat?character=${char.id}`)}
                className="card-warm p-5 text-left hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{char.avatar}</span>
                  <div>
                    <h3 className="text-sm font-medium text-ink">{char.name}</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-paper-border text-ink-muted">
                      {char.tier === "premium" ? "高级" : char.tier === "story" ? "故事" : "基础"}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">{char.persona}</p>
                {char.relationship && (
                  <div className="flex gap-3 mt-3 pt-3 border-t border-paper-border">
                    {(["affection", "trust", "intimacy"] as const).map((key) => (
                      <div key={key} className="text-center flex-1">
                        <div className="text-[11px] text-ink-muted">
                          {key === "affection" ? "好感" : key === "trust" ? "信任" : "亲密"}
                        </div>
                        <div className="text-xs text-ink font-medium mt-0.5">
                          {char.relationship![key]}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
