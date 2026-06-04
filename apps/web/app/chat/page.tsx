"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { getSession, getInviteStatus, logout } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import type { SessionUser } from "@/lib/auth";
import CharacterList from "@/components/chat/CharacterList";
import type { CharacterItem } from "@/components/chat/CharacterList";
import ChatWindow from "@/components/chat/ChatWindow";
import RelationshipPanel from "@/components/chat/RelationshipPanel";

interface RelationshipState {
  affection: number;
  trust: number;
  intimacy: number;
  reason: string;
}

function ChatPageInner() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [selectedChar, setSelectedChar] = useState<CharacterItem | null>(null);
  const [relationship, setRelationship] = useState<RelationshipState>({
    affection: 50, trust: 50, intimacy: 50, reason: "",
  });
  const [starCost, setStarCost] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  useEffect(() => {
    async function init() {
      const session = await getSession();
      if (!session?.user) {
        router.replace("/login");
        return;
      }
      setUser(session.user);

      const status = await getInviteStatus();
      if (!status.invited) {
        router.replace("/invite-waiting");
        return;
      }

      try {
        const chars = await apiGet<CharacterItem[]>("/api/characters");
        setCharacters(chars);
        if (chars.length > 0) {
          setSelectedChar(chars[0]);
          if (chars[0].relationship) {
            setRelationship({
              affection: chars[0].relationship.affection,
              trust: chars[0].relationship.trust,
              intimacy: chars[0].relationship.intimacy,
              reason: "",
            });
          }
        }
      } catch {
        // Characters may be unavailable; show empty state
      }

      setLoading(false);
    }

    init();
  }, [router]);

  useEffect(() => {
    if (selectedChar?.relationship) {
      setRelationship({
        affection: selectedChar.relationship.affection,
        trust: selectedChar.relationship.trust,
        intimacy: selectedChar.relationship.intimacy,
        reason: "",
      });
    } else {
      setRelationship({ affection: 50, trust: 50, intimacy: 50, reason: "" });
    }
  }, [selectedChar]);

  const handleRelationshipUpdate = useCallback((delta: { affection: number; trust: number; intimacy: number; reason: string }) => {
    setRelationship(delta);
  }, []);

  const handleSelectCharacter = useCallback((char: CharacterItem) => {
    setSelectedChar(char);
    setMobileView("chat");
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace("/login");
  }, [router]);

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-paper">
        <p className="text-ink-muted text-sm animate-soft-fade-in">加载中……</p>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="h-screen flex flex-col bg-paper overflow-hidden">
      {/* Top bar */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-paper-border bg-paper-light shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌙</span>
          <span className="text-sm font-serif text-ink">叙境</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-muted">{user.name}</span>
          <button
            onClick={handleLogout}
            className="text-xs text-ink-light hover:text-ink-muted transition-colors"
          >
            退出
          </button>
        </div>
      </header>

      {/* Three-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Character List */}
        <aside className="w-[260px] border-r border-paper-border shrink-0 hidden xl:block">
          <CharacterList
            characters={characters}
            selectedId={selectedChar?.id ?? null}
            onSelect={handleSelectCharacter}
          />
        </aside>

        {/* Mobile character list (overlay) */}
        {mobileView === "list" && (
          <aside className="w-full border-r border-paper-border shrink-0 xl:hidden">
            <CharacterList
              characters={characters}
              selectedId={selectedChar?.id ?? null}
              onSelect={handleSelectCharacter}
            />
          </aside>
        )}

        {/* Center: Chat */}
        <section className={`flex-1 flex flex-col min-w-0 ${mobileView === "list" ? "hidden xl:flex" : "flex"}`}>
          {/* Mobile back button */}
          <div className="xl:hidden flex items-center px-3 py-1 border-b border-paper-border bg-paper-light">
            <button
              onClick={() => setMobileView("list")}
              className="text-ink-muted text-xs hover:text-ink transition-colors"
            >
              ← 角色列表
            </button>
          </div>

          {selectedChar ? (
            <ChatWindow
              userId={user.id}
              character={selectedChar}
              onRelationshipUpdate={handleRelationshipUpdate}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-ink-muted text-sm">选择一个角色开始对话</p>
            </div>
          )}
        </section>

        {/* Right: Relationship + Star Diamonds */}
        <aside className="w-[260px] border-l border-paper-border shrink-0 hidden lg:block">
          <RelationshipPanel relationship={relationship} starCost={starCost} />
        </aside>
      </div>
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <main className="flex items-center justify-center min-h-screen bg-paper">
        <p className="text-ink-muted text-sm">加载中……</p>
      </main>
    }>
      <ChatPageInner />
    </Suspense>
  );
}
