"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost } from "@/lib/api";
import { getSession, logout } from "@/lib/auth";

function InviteWaitingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/chat";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRedeem = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("请输入邀请码");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await apiPost<{ message: string; invited: boolean; alreadyInvited?: boolean }>(
        "/api/invite/redeem",
        { code: trimmed }
      );
      if (data.invited || data.alreadyInvited) {
        setSuccess(data.message ?? "欢迎加入叙境内测！");
        setTimeout(() => router.replace(redirectTo), 1500);
      } else {
        setError("邀请码无效");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "兑换失败，请稍后重试";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [code, redirectTo, router]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace("/login");
  }, [router]);

  return (
    <main className="flex items-center justify-center min-h-screen bg-paper px-6">
      <div className="w-full max-w-sm text-center animate-soft-fade-in">
        <div className="text-5xl mb-4">🌙</div>
        <h1 className="text-[22px] font-serif text-ink mb-1">叙境 · 内测邀请</h1>
        <p className="text-ink-muted text-sm mb-8">
          叙境目前处于内测阶段，需要邀请码才能进入。
        </p>

        {success ? (
          <div className="bg-paper-muted border border-paper-border rounded-card p-6">
            <p className="text-ink text-sm">✨ {success}</p>
            <p className="text-ink-muted text-xs mt-2">正在跳转……</p>
          </div>
        ) : (
          <div className="bg-paper-muted border border-paper-border rounded-card p-6 text-left">
            <label className="text-ink-muted text-[13px] block mb-3">
              🔑 输入你的邀请码
            </label>
            <input
              type="text"
              placeholder="邀请码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
              className="input-warm w-full mb-3"
            />
            <button
              onClick={handleRedeem}
              disabled={loading || !code.trim()}
              className="btn-warm w-full h-11 mb-2"
            >
              {loading ? "验证中……" : "提交邀请码"}
            </button>

            {error && (
              <p className="text-red-400 text-xs mt-2">{error}</p>
            )}
          </div>
        )}

        <button
          onClick={handleLogout}
          className="text-ink-light text-xs mt-6 hover:text-ink-muted transition-colors"
        >
          退出登录
        </button>
      </div>
    </main>
  );
}

export default function InviteWaitingPage() {
  return (
    <Suspense fallback={
      <main className="flex items-center justify-center min-h-screen bg-paper">
        <p className="text-ink-muted text-sm">加载中……</p>
      </main>
    }>
      <InviteWaitingForm />
    </Suspense>
  );
}
