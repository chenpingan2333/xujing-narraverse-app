"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout, Input, Button, Typography, Space, message, Divider } from "antd";
import { GithubOutlined, MailOutlined, LockOutlined, ArrowRightOutlined } from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/chat";

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const sendCode = useCallback(async () => {
    if (!email || !email.includes("@")) {
      message.warning("请输入有效的邮箱地址");
      return;
    }
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
        message.success("验证码已发送");
        setCooldown(30);
        const timer = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) { clearInterval(timer); return 0; }
            return prev - 1;
          });
        }, 1000);
      } else {
        message.error(data.error ?? "发送失败");
      }
    } catch {
      message.error("网络异常，请稍后再试");
    } finally {
      setLoading(false);
    }
  }, [email]);

  const verifyCode = useCallback(async () => {
    if (otp.length !== 6) {
      message.warning("请输入6位验证码");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });
      const data = await res.json();
      if (res.ok) {
        message.success("登录成功");

        const inviteRes = await fetch("/api/invite/status");
        const inviteData = await inviteRes.json();

        if (inviteData.invited) {
          router.replace(redirectTo);
        } else {
          router.replace("/invite-waiting?redirect=" + encodeURIComponent(redirectTo));
        }
      } else {
        message.error(data.error ?? "验证失败");
        if (data.error?.includes("尝试次数过多")) {
          setStep("email");
          setOtp("");
        }
      }
    } catch {
      message.error("网络异常，请稍后再试");
    } finally {
      setLoading(false);
    }
  }, [email, otp, redirectTo, router]);

  const loginWithGitHub = useCallback(() => {
    window.location.href = "/api/auth/github/login";
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: "#fffaf5" }}>
      <Content style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌙</div>
          <Title level={3} style={{
            color: "#5C4033", fontWeight: 400,
            fontFamily: "'Georgia','Noto Serif SC',serif", marginBottom: 8,
          }}>
            叙境
          </Title>
          <Paragraph style={{ color: "#B08968", fontSize: 14, marginBottom: 32 }}>
            一个有温度的空间，角色在等你。
          </Paragraph>

          <Button
            block
            size="large"
            icon={<GithubOutlined />}
            onClick={loginWithGitHub}
            style={{
              height: 48, borderRadius: 12,
              background: "#24292e", border: "none", color: "#fff",
              fontSize: 15, fontWeight: 500, marginBottom: 16,
            }}
          >
            Continue with GitHub
          </Button>

          <Divider style={{ borderColor: "#ead9c0", color: "#c4a68a", fontSize: 12 }}>
            或使用邮箱
          </Divider>

          <div style={{
            background: "#fdf8f0", borderRadius: 16, padding: "24px 20px",
            border: "1px solid #ead9c0", textAlign: "left",
          }}>
            {step === "email" ? (
              <>
                <Text style={{ color: "#B08968", fontSize: 13, display: "block", marginBottom: 12 }}>
                  <MailOutlined style={{ marginRight: 6 }} />邮箱验证码登录
                </Text>
                <Input
                  size="large"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onPressEnter={sendCode}
                  style={{
                    background: "#fffaf5", borderColor: "#ead9c0",
                    color: "#5C4033", fontSize: 14, marginBottom: 12,
                  }}
                />
                <Button
                  block
                  size="large"
                  type="primary"
                  onClick={sendCode}
                  loading={loading}
                  icon={<ArrowRightOutlined />}
                  disabled={!email.includes("@")}
                  style={{
                    height: 44, borderRadius: 12,
                    background: email.includes("@")
                      ? "linear-gradient(135deg, #f6c177, #f0a860)"
                      : "#e8d5c0",
                    border: "none", color: "#fffdf9", fontWeight: 400,
                  }}
                >
                  发送验证码
                </Button>
              </>
            ) : (
              <>
                <Text style={{ color: "#B08968", fontSize: 13, display: "block", marginBottom: 8 }}>
                  验证码已发送至 {email}
                </Text>
                <Button
                  type="link"
                  size="small"
                  onClick={() => { setStep("email"); setOtp(""); }}
                  disabled={loading}
                  style={{ color: "#c4a68a", padding: 0, marginBottom: 12, display: "block" }}
                >
                  更换邮箱
                </Button>

                <Input
                  size="large"
                  placeholder="输入6位验证码"
                  value={otp}
                  maxLength={6}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  onPressEnter={verifyCode}
                  prefix={<LockOutlined style={{ color: "#B08968" }} />}
                  style={{
                    background: "#fffaf5", borderColor: "#ead9c0",
                    color: "#5C4033", fontSize: 18, letterSpacing: 8,
                    textAlign: "center", marginBottom: 12,
                  }}
                />
                <Button
                  block
                  size="large"
                  type="primary"
                  onClick={verifyCode}
                  loading={loading}
                  disabled={otp.length !== 6}
                  style={{
                    height: 44, borderRadius: 12,
                    background: otp.length === 6
                      ? "linear-gradient(135deg, #f6c177, #f0a860)"
                      : "#e8d5c0",
                    border: "none", color: "#fffdf9", fontWeight: 400,
                    marginBottom: 8,
                  }}
                >
                  验证登录
                </Button>
                <Button
                  block
                  type="text"
                  onClick={sendCode}
                  loading={loading}
                  disabled={cooldown > 0}
                  style={{ color: "#c4a68a", fontSize: 13 }}
                >
                  {cooldown > 0 ? `${cooldown}秒后可重发` : "重新发送验证码"}
                </Button>
              </>
            )}
          </div>
        </div>
      </Content>
    </Layout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Layout style={{ minHeight: "100vh", background: "#fffaf5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#B08968", fontSize: 14 }}>加载中……</Text>
      </Layout>
    }>
      <LoginPageInner />
    </Suspense>
  );
}
