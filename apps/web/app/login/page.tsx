"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getInviteStatus } from "@/lib/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/chat";

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");

  const sendCode = useCallback(async () => {
    if (!email.includes("@")) {
      setError("请输入有效的邮箱地址");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/email/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep("otp");
        setCooldown(30);
        const timer = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) { clearInterval(timer); return 0; }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(data.error ?? "发送失败");
      }
    } catch {
      setError("网络异常，请稍后再试");
    } finally {
      setLoading(false);
    }
  }, [email]);

  const verifyCode = useCallback(async () => {
    if (otp.length !== 6) {
      setError("请输入6位验证码");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });
      const data = await res.json();
      if (res.ok) {
        const status = await getInviteStatus();
        if (status.invited) {
          router.replace(redirectTo);
        } else {
          router.replace("/invite-waiting?redirect=" + encodeURIComponent(redirectTo));
        }
      } else {
        setError(data.error ?? "验证失败");
        if (data.error?.includes("尝试次数过多")) {
          setStep("email");
          setOtp("");
        }
      }
    } catch {
      setError("网络异常，请稍后再试");
    } finally {
      setLoading(false);
    }
  }, [email, otp, redirectTo, router]);

  const loginWithGitHub = useCallback(() => {
    window.location.href = "/api/auth/github/login";
  }, []);

  return (
    <main className="flex items-center justify-center min-h-screen bg-paper px-6">
      <div className="w-full max-w-sm text-center animate-soft-fade-in">
        {/* Brand */}
        <div className="text-5xl mb-4">🌙</div>
        <h1 className="text-[22px] font-serif text-ink mb-1">叙境</h1>
        <p className="text-ink-muted text-sm mb-8">一个有温度的空间，角色在等你。</p>

        {/* GitHub */}
        <button
          onClick={loginWithGitHub}
          className="w-full h-12 flex items-center justify-center gap-2 rounded-btn text-white text-[15px] font-medium mb-4"
          style={{ background: "#24292e" }}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          Continue with GitHub
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-paper-border" />
          <span className="text-xs text-ink-light">或使用邮箱</span>
          <div className="flex-1 h-px bg-paper-border" />
        </div>

        {/* Email card */}
        <div className="bg-paper-muted border border-paper-border rounded-card p-6 text-left">
          {step === "email" ? (
            <>
              <p className="text-ink-muted text-[13px] mb-3">📧 邮箱验证码登录</p>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendCode()}
                className="input-warm w-full mb-3"
              />
              <button
                onClick={sendCode}
                disabled={loading || !email.includes("@")}
                className="btn-warm w-full h-11"
              >
                {loading ? "发送中……" : "发送验证码 →"}
              </button>
            </>
          ) : (
            <>
              <p className="text-ink-muted text-[13px] mb-2">验证码已发送至 {email}</p>
              <button
                onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                disabled={loading}
                className="text-ink-light text-xs mb-3 hover:text-ink-muted transition-colors"
              >
                更换邮箱
              </button>

              <input
                type="text"
                inputMode="numeric"
                placeholder="输入6位验证码"
                value={otp}
                maxLength={6}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && verifyCode()}
                className="input-warm w-full mb-3 text-center text-lg tracking-[8px]"
                style={{ letterSpacing: "8px" }}
              />
              <button
                onClick={verifyCode}
                disabled={loading || otp.length !== 6}
                className="btn-warm w-full h-11 mb-2"
              >
                {loading ? "验证中……" : "验证登录"}
              </button>
              <button
                onClick={sendCode}
                disabled={loading || cooldown > 0}
                className="w-full text-ink-light text-[13px] hover:text-ink-muted transition-colors py-1"
              >
                {cooldown > 0 ? `${cooldown}秒后可重发` : "重新发送验证码"}
              </button>
            </>
          )}

          {error && (
            <p className="text-red-400 text-xs mt-3">{error}</p>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex items-center justify-center min-h-screen bg-paper">
        <p className="text-ink-muted text-sm">加载中……</p>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
