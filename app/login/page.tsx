"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout, Input, Button, Typography, Space, message, Divider } from "antd";
import { GithubOutlined, MailOutlined, LockOutlined, ArrowRightOutlined, EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/chat";

  const [showRegister, setShowRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const sendCode = useCallback(async () => {
    if (!email || !email.includes("@")) {
      message.warning("请输入有效的邮箱地址");
      return;
    }
    setSendingCode(true);
    try {
      const res = await fetch("/api/auth/email/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
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
      setSendingCode(false);
    }
  }, [email]);

  const handleRegister = useCallback(async () => {
    if (otp.length !== 6) {
      message.warning("请输入6位验证码");
      return;
    }
    if (password.length < 6) {
      message.warning("密码至少6位");
      return;
    }
    if (password !== confirmPassword) {
      message.warning("两次密码不一致");
      return;
    }
    if (!inviteCode || inviteCode.length < 4) {
      message.warning("请输入有效的邀请码");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/email/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code: otp,
          password,
          confirmPassword,
          inviteCode,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        message.success("注册成功");
        router.replace(redirectTo);
      } else {
        message.error(data.error ?? "注册失败");
      }
    } catch {
      message.error("网络异常，请稍后再试");
    } finally {
      setLoading(false);
    }
  }, [email, otp, password, confirmPassword, inviteCode, redirectTo, router]);

  const loginWithGitHub = useCallback(() => {
    window.location.href = "/api/auth/github/login";
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: "#fffaf5" }}>
      <Content style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
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

          {!showRegister ? (
            <Button
              block
              size="large"
              icon={<MailOutlined />}
              onClick={() => setShowRegister(true)}
              style={{
                height: 48, borderRadius: 12,
                background: "linear-gradient(135deg, #f6c177, #f0a860)",
                border: "none", color: "#fffdf9",
                fontSize: 15, fontWeight: 400,
              }}
            >
              邮箱验证码登录
            </Button>
          ) : (
            <div style={{
              background: "#fdf8f0", borderRadius: 16, padding: "28px 24px",
              border: "1px solid #ead9c0", textAlign: "left",
            }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Text style={{ color: "#B08968", fontSize: 13 }}>
                  <MailOutlined style={{ marginRight: 6 }} />邮箱注册
                </Text>
                <Button
                  type="text"
                  size="small"
                  onClick={() => setShowRegister(false)}
                  style={{ color: "#c4a68a", fontSize: 12, padding: 0 }}
                >
                  返回
                </Button>
              </div>

              {/* Email + Send Code */}
              <div style={{ marginBottom: 14 }}>
                <Text style={{ color: "#8B7355", fontSize: 12, display: "block", marginBottom: 6 }}>邮箱</Text>
                <div style={{ display: "flex", gap: 8 }}>
                  <Input
                    size="large"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      flex: 1, background: "#fffaf5", borderColor: "#ead9c0",
                      color: "#5C4033", fontSize: 14,
                    }}
                  />
                  <Button
                    size="large"
                    onClick={sendCode}
                    loading={sendingCode}
                    disabled={!email.includes("@") || cooldown > 0}
                    style={{
                      background: email.includes("@") && cooldown === 0
                        ? "linear-gradient(135deg, #f6c177, #f0a860)"
                        : "#e8d5c0",
                      border: "none", color: "#fffdf9", borderRadius: 10,
                      fontWeight: 400, whiteSpace: "nowrap",
                    }}
                  >
                    {cooldown > 0 ? `${cooldown}s` : "发送验证码"}
                  </Button>
                </div>
              </div>

              {/* Verification Code */}
              <div style={{ marginBottom: 14 }}>
                <Text style={{ color: "#8B7355", fontSize: 12, display: "block", marginBottom: 6 }}>邮箱验证码</Text>
                <Input
                  size="large"
                  placeholder="输入6位验证码"
                  value={otp}
                  maxLength={6}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  prefix={<LockOutlined style={{ color: "#B08968" }} />}
                  style={{
                    background: "#fffaf5", borderColor: "#ead9c0",
                    color: "#5C4033", fontSize: 16, letterSpacing: 6,
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 14 }}>
                <Text style={{ color: "#8B7355", fontSize: 12, display: "block", marginBottom: 6 }}>密码</Text>
                <Input.Password
                  size="large"
                  placeholder="至少6位密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                  style={{
                    background: "#fffaf5", borderColor: "#ead9c0",
                    color: "#5C4033", fontSize: 14,
                  }}
                />
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: 14 }}>
                <Text style={{ color: "#8B7355", fontSize: 12, display: "block", marginBottom: 6 }}>确认密码</Text>
                <Input.Password
                  size="large"
                  placeholder="再次输入密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                  style={{
                    background: "#fffaf5", borderColor: "#ead9c0",
                    color: "#5C4033", fontSize: 14,
                  }}
                />
              </div>

              {/* Invite Code */}
              <div style={{ marginBottom: 20 }}>
                <Text style={{ color: "#8B7355", fontSize: 12, display: "block", marginBottom: 6 }}>邀请码</Text>
                <Input
                  size="large"
                  placeholder="输入邀请码"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.trim())}
                  style={{
                    background: "#fffaf5", borderColor: "#ead9c0",
                    color: "#5C4033", fontSize: 14,
                  }}
                />
              </div>

              {/* Submit */}
              <Button
                block
                size="large"
                type="primary"
                onClick={handleRegister}
                loading={loading}
                disabled={otp.length !== 6 || password.length < 6 || password !== confirmPassword || !inviteCode}
                icon={<ArrowRightOutlined />}
                style={{
                  height: 44, borderRadius: 12,
                  background: otp.length === 6 && password.length >= 6 && password === confirmPassword && inviteCode
                    ? "linear-gradient(135deg, #f6c177, #f0a860)"
                    : "#e8d5c0",
                  border: "none", color: "#fffdf9", fontWeight: 400,
                }}
              >
                注册
              </Button>
            </div>
          )}
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