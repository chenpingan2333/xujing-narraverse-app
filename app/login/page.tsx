"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout, Input, Button, Typography, message, Divider } from "antd";
import { GithubOutlined, MailOutlined, LockOutlined, ArrowRightOutlined, EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";

const { Title, Text } = Typography;
const { Content } = Layout;

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/chat";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // ── Login ──
  const handleLogin = useCallback(async () => {
    if (!email.includes("@")) { message.warning("请输入正确的邮箱"); return; }
    if (!password) { message.warning("请输入密码"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        router.replace(redirectTo);
      } else {
        message.error(data.error ?? "登录失败");
      }
    } catch { message.error("网络连接失败"); }
    finally { setLoading(false); }
  }, [email, password, redirectTo, router]);

  // ── Send code ──
  const sendCode = useCallback(async () => {
    if (!email.includes("@")) { message.warning("请填写正确的邮箱"); return; }
    setSendingCode(true);
    try {
      const res = await fetch("/api/auth/email/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) { message.success("验证码已发送"); setCooldown(30);
        const t = setInterval(() => setCooldown(p => { if(p<=1){clearInterval(t);return 0} return p-1 }), 1000);
      } else { message.error(data.error ?? "发送失败"); }
    } catch { message.error("网络连接失败"); }
    finally { setSendingCode(false); }
  }, [email]);

  // ── Register ──
  const handleRegister = useCallback(async () => {
    if (otp.length !== 6) { message.warning("请填写验证码"); return; }
    if (password.length < 6) { message.warning("密码至少6位"); return; }
    if (password !== confirmPassword) { message.warning("两次密码不一致"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/email/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp, password, confirmPassword }),
      });
      const data = await res.json();
      if (res.ok) { message.success("注册成功"); router.replace(redirectTo); }
      else { message.error(data.error ?? "注册失败"); }
    } catch { message.error("网络连接失败"); }
    finally { setLoading(false); }
  }, [email, otp, password, confirmPassword, redirectTo, router]);

  const loginWithGitHub = () => { window.location.href = "/api/auth/github/login"; };

  const inputStyle = { background: "#fffaf5", borderColor: "#ead9c0", color: "#5C4033", fontSize: 14 };
  const btnGold = { height: 44, borderRadius: 12, background: "linear-gradient(135deg, #f6c177, #f0a860)", border: "none", color: "#fffdf9", fontWeight: 400 };

  return (
    <Layout style={{ minHeight: "100vh", background: "#fffaf5" }}>
      <Content style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>叙境</div>
          <Title level={3} style={{ color: "#5C4033", fontWeight: 400, fontFamily: "'Georgia','Noto Serif SC',serif" }}>
            {mode === "login" ? "登录叙境" : "注册叙境"}
          </Title>

          {/* ── LOGIN FORM ── */}
          {mode === "login" && (
            <div style={{ textAlign: "left", marginTop: 24 }}>
              <Input size="large" prefix={<MailOutlined style={{color:"#B08968"}}/>} placeholder="邮箱"
                value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle} />
              <Input.Password size="large" prefix={<LockOutlined style={{color:"#B08968"}}/>} placeholder="密码"
                value={password} onChange={e=>setPassword(e.target.value)}
                iconRender={v=>v?<EyeTwoTone/>:<EyeInvisibleOutlined/>}
                style={{...inputStyle, marginTop: 12}} />
              <Button block size="large" onClick={handleLogin} loading={loading}
                disabled={!email.includes("@") || !password}
                icon={<ArrowRightOutlined />} style={{...btnGold, marginTop: 16}}>
                登录
              </Button>
            </div>
          )}

          {/* ── GitHub ── */}
          <Button block size="large" icon={<GithubOutlined />} onClick={loginWithGitHub}
            style={{ height: 48, borderRadius: 12, background: "#24292e", border: "none", color: "#fff", fontSize: 15, fontWeight: 500, marginTop: 16 }}>
            GitHub 登录
          </Button>

          <Divider style={{ borderColor: "#ead9c0", color: "#c4a68a", fontSize: 12 }}>或</Divider>

          {/* ── REGISTER TOGGLE / FORM ── */}
          {mode === "login" ? (
            <Button block size="large" icon={<MailOutlined />} onClick={() => setMode("register")}
              style={{...btnGold, height: 48, fontSize: 15}}>
              未注册？点击这里注册
            </Button>
          ) : (
            <div style={{ background: "#fdf8f0", borderRadius: 16, padding: "28px 24px", border: "1px solid #ead9c0", textAlign: "left" }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <Text style={{color:"#B08968",fontSize:13}}><MailOutlined style={{marginRight:6}}/>邮箱验证</Text>
                <Button type="text" size="small" onClick={()=>setMode("login")} style={{color:"#c4a68a",fontSize:12}}>返回登录</Button>
              </div>
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                <Input size="large" placeholder="your@email.com" value={email}
                  onChange={e=>setEmail(e.target.value)} style={{...inputStyle,flex:1}}/>
                <Button size="large" onClick={sendCode} loading={sendingCode}
                  disabled={!email.includes("@")||cooldown>0}
                  style={{background:email.includes("@")&&cooldown===0?"linear-gradient(135deg, #f6c177, #f0a860)":"#e8d5c0",border:"none",color:"#fffdf9",borderRadius:10,whiteSpace:"nowrap"}}>
                  {cooldown>0?`${cooldown}s`:"获取验证码"}
                </Button>
              </div>
              <Input size="large" placeholder="6位验证码" value={otp} maxLength={6}
                onChange={e=>setOtp(e.target.value.replace(/\D/g,""))}
                prefix={<LockOutlined style={{color:"#B08968"}}/>}
                style={{...inputStyle,letterSpacing:6,marginBottom:14}}/>
              <Input.Password size="large" placeholder="设置密码" value={password}
                onChange={e=>setPassword(e.target.value)}
                iconRender={v=>v?<EyeTwoTone/>:<EyeInvisibleOutlined/>}
                style={{...inputStyle,marginBottom:14}}/>
              <Input.Password size="large" placeholder="确认密码" value={confirmPassword}
                onChange={e=>setConfirmPassword(e.target.value)}
                iconRender={v=>v?<EyeTwoTone/>:<EyeInvisibleOutlined/>}
                style={{...inputStyle,marginBottom:14}}/>
              <Button block size="large" onClick={handleRegister} loading={loading}
                disabled={otp.length!==6||password.length<6||password!==confirmPassword}
                icon={<ArrowRightOutlined />}
                style={{...btnGold,background:otp.length===6&&password.length>=6&&password===confirmPassword?"linear-gradient(135deg, #f6c177, #f0a860)":"#e8d5c0"}}>
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
    <Suspense fallback={<Layout style={{minHeight:"100vh",background:"#fffaf5",display:"flex",alignItems:"center",justifyContent:"center"}}><Text style={{color:"#B08968"}}>加载中...</Text></Layout>}>
      <LoginPageInner />
    </Suspense>
  );
}