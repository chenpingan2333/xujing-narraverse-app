"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, getInviteStatus } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import type { SessionUser } from "@/lib/auth";

interface World {
  id: string;
  name: string;
  tier: string;
  worldType: string;
  mode: "simple" | "advanced";
  description: string;
}

const worldTypeEmojis: Record<string, string> = {
  fantasy: "🏰",
  scifi: "🚀",
  wuxia: "⚔️",
};

const tierLabels: Record<string, string> = {
  basic: "基础",
  premium: "高级",
  story: "故事",
};

export default function WorldsPage() {
  const router = useRouter();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const session = await getSession();
      if (!session?.user) { router.replace("/login"); return; }
      const status = await getInviteStatus();
      if (!status.invited) { router.replace("/invite-waiting"); return; }

      try {
        const data = await apiGet<World[]>("/api/worlds");
        setWorlds(data);
      } catch { /* empty */ }
      setLoading(false);
    }
    init();
  }, [router]);

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
          <h1 className="text-lg font-serif text-ink">世界</h1>
        </div>
      </header>

      {/* World grid */}
      <div className="p-6">
        {worlds.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-ink-muted text-sm">暂无可用世界</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {worlds.map((world) => (
              <button
                key={world.id}
                onClick={() => router.push(`/chat?world=${world.id}`)}
                className="card-warm p-5 text-left hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl shrink-0">{worldTypeEmojis[world.worldType] ?? "🌍"}</span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-ink truncate">{world.name}</h3>
                    <div className="flex gap-1.5 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-paper-border text-ink-muted">
                        {tierLabels[world.tier] ?? world.tier}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-paper-border text-ink-muted">
                        {world.mode === "advanced" ? "深度" : "休闲"}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">{world.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
