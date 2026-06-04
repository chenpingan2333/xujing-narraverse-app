"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout, Input, Button, Typography, Space, message } from "antd";
import { LockOutlined, SendOutlined } from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;

function InviteWaitingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/chat";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/invite/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.invited) {
          router.replace(redirectTo);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [router, redirectTo]);

  const redeem = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed || trimmed.length < 4) {
      message.warning("请输入有效的邀请码");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/invite/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.invited) {
        message.success("欢迎加入叙境内测！");
        setTimeout(() => router.replace(redirectTo), 600);
      } else {
        message.error(data.error ?? "邀请码无效或已用完");
      }
    } catch {
      message.error("网络异常，请稍后再试");
    } finally {
      setLoading(false);
    }
  }, [code, router, redirectTo]);

  if (checking) {
    return (
      <Layout style={{ minHeight: "100vh", background: "#fffaf5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#B08968", fontSize: 14 }}>正在验证……</Text>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh", background: "#fffaf5" }}>
      <Content style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🌙</div>
          <Title level={3} style={{ color: "#5C4033", fontWeight: 400, fontFamily: "'Georgia','Noto Serif SC',serif", marginBottom: 12 }}>
            叙境 · 内测邀请
          </Title>
          <Paragraph style={{ color: "#B08968", fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>
            叙境正在小范围测试中。<br />
            每个角色都在等待属于她的旅人。<br />
            输入你的邀请码，故事从此开始。
          </Paragraph>

          <div style={{
            background: "#fdf8f0", borderRadius: 16, padding: "24px 20px",
            border: "1px solid #ead9c0",
          }}>
            <Space.Compact style={{ width: "100%" }}>
              <Input
                size="large"
                prefix={<LockOutlined style={{ color: "#B08968" }} />}
                placeholder="输入邀请码"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onPressEnter={redeem}
                maxLength={32}
                style={{
                  background: "#fffaf5",
                  borderColor: "#ead9c0",
                  color: "#5C4033",
                  fontSize: 14,
                }}
              />
              <Button
                size="large"
                type="primary"
                icon={<SendOutlined />}
                onClick={redeem}
                loading={loading}
                style={{
                  background: "linear-gradient(135deg, #f6c177, #f0a860)",
                  border: "none",
                  color: "#fffdf9",
                  fontWeight: 400,
                }}
              >
                进入
              </Button>
            </Space.Compact>

            <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid #ead9c0" }}>
              <Text style={{ color: "#c4a68a", fontSize: 12 }}>
                还没有邀请码？<br />
                关注社交账号获取内测资格。
              </Text>
            </div>
          </div>
        </div>
      </Content>
    </Layout>
  );
}

export default function InviteWaitingPage() {
  return (
    <Suspense fallback={
      <Layout style={{ minHeight: "100vh", background: "#fffaf5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#B08968", fontSize: 14 }}>正在验证……</Text>
      </Layout>
    }>
      <InviteWaitingInner />
    </Suspense>
  );
}
