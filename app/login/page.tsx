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
  
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const sendCode = useCallback(async () => {
    if (!email || !email.includes("@")) {
      message.warning("鐠囩柉绶崗銉︽箒閺佸牏娈戦柇顔绢唸閸︽澘娼?);
      return;
    }
    setSendingCode(true);
    try {
      const res = await fetch("/api/auth/email/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })});
      const data = await res.json();
      if (res.ok) {
        message.success("妤犲矁鐦夐惍浣稿嚒閸欐垿鈧?);
        setCooldown(30);
        const timer = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) { clearInterval(timer); return 0; }
            return prev - 1;
          });
        }, 1000);
      } else {
        message.error(data.error ?? "閸欐垿鈧礁銇戠拹?);
      }
    } catch {
      message.error("缂冩垹绮跺鍌氱埗閿涘矁顕粙宥呮倵閸愬秷鐦?);
    } finally {
      setSendingCode(false);
    }
  }, [email]);

  const handleRegister = useCallback(async () => {
    if (otp.length !== 6) {
      message.warning("鐠囩柉绶崗?娴ｅ秹鐛欑拠浣虹垳");
      return;
    }
    if (password.length < 6) {
      message.warning("鐎靛棛鐖滈懛鍐茬毌6娴?);
      return;
    }
    if (password !== confirmPassword) {
      message.warning("娑撱倖顐肩€靛棛鐖滄稉宥勭閼?);
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
          confirmPassword})});
      const data = await res.json();
      if (res.ok) {
        message.success("濞夈劌鍞介幋鎰");
        router.replace(redirectTo);
      } else {
        message.error(data.error ?? "濞夈劌鍞芥径杈Е");
      }
    } catch {
      message.error("缂冩垹绮跺鍌氱埗閿涘矁顕粙宥呮倵閸愬秷鐦?);
    } finally {
      setLoading(false);
    }
  }, [email, otp, password, confirmPassword, redirectTo, router]);

  const loginWithGitHub = useCallback(() => {
    window.location.href = "/api/auth/github/login";
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: "#fffaf5" }}>
      <Content style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>棣冨</div>
          <Title level={3} style={{
            color: "#5C4033", fontWeight: 400,
            fontFamily: "'Georgia','Noto Serif SC',serif", marginBottom: 8}}>
            閸欐瑥顣?          </Title>
          <Paragraph style={{ color: "#B08968", fontSize: 14, marginBottom: 32 }}>
            娑撯偓娑擃亝婀佸〒鈺佸閻ㄥ嫮鈹栭梻杈剧礉鐟欐帟澹婇崷銊х搼娴ｇ姰鈧?          </Paragraph>

          <Button
            block
            size="large"
            icon={<GithubOutlined />}
            onClick={loginWithGitHub}
            style={{
              height: 48, borderRadius: 12,
              background: "#24292e", border: "none", color: "#fff",
              fontSize: 15, fontWeight: 500, marginBottom: 16}}
          >
            Continue with GitHub
          </Button>

          <Divider style={{ borderColor: "#ead9c0", color: "#c4a68a", fontSize: 12 }}>
            閹存牔濞囬悽銊╁仏缁?          </Divider>

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
                fontSize: 15, fontWeight: 400}}
            >
              闁喚顔堟宀冪槈閻胶娅ヨぐ?            </Button>
          ) : (
            <div style={{
              background: "#fdf8f0", borderRadius: 16, padding: "28px 24px",
              border: "1px solid #ead9c0", textAlign: "left"}}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Text style={{ color: "#B08968", fontSize: 13 }}>
                  <MailOutlined style={{ marginRight: 6 }} />闁喚顔堝▔銊ュ斀
                </Text>
                <Button
                  type="text"
                  size="small"
                  onClick={() => setShowRegister(false)}
                  style={{ color: "#c4a68a", fontSize: 12, padding: 0 }}
                >
                  鏉╂柨娲?                </Button>
              </div>

              {/* Email + Send Code */}
              <div style={{ marginBottom: 14 }}>
                <Text style={{ color: "#8B7355", fontSize: 12, display: "block", marginBottom: 6 }}>闁喚顔?/Text>
                <div style={{ display: "flex", gap: 8 }}>
                  <Input
                    size="large"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      flex: 1, background: "#fffaf5", borderColor: "#ead9c0",
                      color: "#5C4033", fontSize: 14}}
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
                      fontWeight: 400, whiteSpace: "nowrap"}}
                  >
                    {cooldown > 0 ? `${cooldown}s` : "閸欐垿鈧線鐛欑拠浣虹垳"}
                  </Button>
                </div>
              </div>

              {/* Verification Code */}
              <div style={{ marginBottom: 14 }}>
                <Text style={{ color: "#8B7355", fontSize: 12, display: "block", marginBottom: 6 }}>闁喚顔堟宀冪槈閻?/Text>
                <Input
                  size="large"
                  placeholder="鏉堟挸鍙?娴ｅ秹鐛欑拠浣虹垳"
                  value={otp}
                  maxLength={6}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  prefix={<LockOutlined style={{ color: "#B08968" }} />}
                  style={{
                    background: "#fffaf5", borderColor: "#ead9c0",
                    color: "#5C4033", fontSize: 16, letterSpacing: 6}}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 14 }}>
                <Text style={{ color: "#8B7355", fontSize: 12, display: "block", marginBottom: 6 }}>鐎靛棛鐖?/Text>
                <Input.Password
                  size="large"
                  placeholder="閼峰啿鐨?娴ｅ秴鐦戦惍?
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                  style={{
                    background: "#fffaf5", borderColor: "#ead9c0",
                    color: "#5C4033", fontSize: 14}}
                />
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: 14 }}>
                <Text style={{ color: "#8B7355", fontSize: 12, display: "block", marginBottom: 6 }}>绾喛顓荤€靛棛鐖?/Text>
                <Input.Password
                  size="large"
                  placeholder="閸愬秵顐兼潏鎾冲弳鐎靛棛鐖?
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                  style={{
                    background: "#fffaf5", borderColor: "#ead9c0",
                    color: "#5C4033", fontSize: 14}}
                />
              </div>

              {/* Submit */}
              <Button
                block
                size="large"
                type="primary"
                onClick={handleRegister}
                loading={loading}
                disabled={otp.length !== 6 || password.length < 6 || password !== confirmPassword}
                icon={<ArrowRightOutlined />}
                style={{
                  height: 44, borderRadius: 12,
                  background: otp.length === 6 && password.length >= 6 && password === confirmPassword 
                    ? "linear-gradient(135deg, #f6c177, #f0a860)"
                    : "#e8d5c0",
                  border: "none", color: "#fffdf9", fontWeight: 400}}
              >
                濞夈劌鍞?              </Button>
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
        <Text style={{ color: "#B08968", fontSize: 14 }}>閸旂姾娴囨稉顓涒偓锔光偓?/Text>
      </Layout>
    }>
      <LoginPageInner />
    </Suspense>
  );
}