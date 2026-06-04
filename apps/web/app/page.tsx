"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const session = await getSession();
      if (cancelled) return;

      if (session?.user) {
        router.replace("/chat");
      } else {
        router.replace("/login");
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex items-center justify-center min-h-screen bg-paper">
      <div className="text-center animate-soft-fade-in">
        <div className="text-5xl mb-4">🌙</div>
        <h1 className="text-2xl font-serif text-ink mb-2">叙境</h1>
        <p className="text-ink-muted text-sm">
          {checking ? "正在确认身份……" : "即将跳转……"}
        </p>
      </div>
    </main>
  );
}
