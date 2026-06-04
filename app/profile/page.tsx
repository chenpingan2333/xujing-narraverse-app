"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layout, Typography, Button, Avatar, Tag, message as antMsg } from "antd";
import {
  UserOutlined, CrownOutlined, WalletOutlined, HistoryOutlined,
  SettingOutlined, LogoutOutlined, RightOutlined, StarOutlined,
  BookOutlined, TeamOutlined, MessageOutlined, CopyOutlined,
  GiftOutlined,
} from "@ant-design/icons";
import { ECONOMY } from "@/config/economy";

const { Title, Text } = Typography;
const { Content } = Layout;

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/session/me").then((r) => r.json()),
      fetch("/api/wallet").then((r) => r.json()),
      fetch("/api/profile/stats").then((r) => r.json()),
    ]).then(([userData, walletData, statsData]) => {
      if (userData.user) setUser(userData.user);
      if (walletData.wallet) setWallet(walletData.wallet);
      if (statsData) setStats(statsData);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/session/logout", { method: "POST" });
      router.push("/login");
    } catch { antMsg.error("閫€鍑哄け璐?); }
  };

  const copyUID = () => {
    const uid = user?.uidDisplay ?? "NAR_000000";
    navigator.clipboard.writeText(uid).then(() => {
      antMsg.success("鐢ㄦ埛ID宸插鍒?);
    }).catch(() => antMsg.info("UID: " + uid));
  };

  const PLAN_LABELS: Record<string, string> = { monthly: "鏈堝崱", quarterly: "瀛ｅ崱", yearly: "骞村崱" };
  const tierLabel = user?.membershipTier ? PLAN_LABELS[user.membershipTier] : null;

  return (
    <Content style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px", minHeight: "100vh", paddingBottom: 40 }} className="page-scroll">
      <Title level={4} style={{ margin: "0 0 24px", color: "#5C4033", fontWeight: 400,
        fontFamily: "'Georgia','Noto Serif SC',serif", letterSpacing: 3 }}>
        鎴戠殑
      </Title>

      {/* User Card */}
      <div style={{ background: "linear-gradient(135deg, #fef5e7, #fdf0e0)", borderRadius: 20, padding: "24px 20px",
        marginBottom: 16, border: "1px solid #f0dcc0", display: "flex", alignItems: "center", gap: 16 }}>
        <Avatar size={56} icon={<UserOutlined />} style={{ background: "#fdf0e0", color: "#B08968", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Title level={5} style={{ margin: 0, color: "#5C4033", fontWeight: 400, fontFamily: "'Georgia','Noto Serif SC',serif" }}>
            {user?.name ?? "鍙欏鏃呬汉"}
          </Title>
          <Text style={{ color: "#B08968", fontSize: 12, display: "block" }}>{user?.email ?? ""}</Text>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Text style={{ color: "#B08968", fontSize: 11, fontFamily: "monospace" }}>
              UID: {user?.uidDisplay ?? "NAR_000000"}
            </Text>
            <Button type="text" size="small" icon={<CopyOutlined />} onClick={copyUID}
              style={{ color: "#B08968", fontSize: 11, padding: 0 }} />
          </div>
        </div>
      </div>

      {/* Wallet Card */}
      <div onClick={() => router.push("/recharge")} style={{
        background: "linear-gradient(135deg, #2a1a3e, #1a0a2e)", borderRadius: 20, padding: "20px",
        marginBottom: 16, cursor: "pointer",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ color: "#b8a0d0", fontSize: 12 }}>
            <WalletOutlined style={{ marginRight: 6 }} />{ECONOMY.STAR_SYMBOL} 鏄熼捇浣欓
          </Text>
          <RightOutlined style={{ color: "#8b5cf6", fontSize: 12 }} />
        </div>
        <Text strong style={{ color: "#e8d0ff", fontSize: 36, fontFamily: "'Georgia',serif", display: "block", textAlign: "center" }}>
          {wallet?.starDiamonds ?? 0}
        </Text>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 8 }}>
          <Text style={{ color: "#b8a0d0", fontSize: 11 }}>绱 +{wallet?.totalEarned ?? 0}</Text>
          <Text style={{ color: "#b8a0d0", fontSize: 11 }}>娑堣垂 -{wallet?.totalSpent ?? 0}</Text>
        </div>
        <Button block onClick={(e) => { e.stopPropagation(); router.push("/recharge"); }}
          style={{ marginTop: 12, borderRadius: 12, background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", border: "none", color: "#fff", fontWeight: 400 }}>
          <GiftOutlined /> 鍏呭€兼槦閽?        </Button>
      </div>

      {/* VIP Status */}
      <div onClick={() => router.push(user?.isVip ? "/membership" : "/membership")} style={{
        background: user?.isVip
          ? "linear-gradient(135deg, #fef5e7, #fdf0e0)"
          : "#fdf8f0",
        borderRadius: 16, padding: "16px 20px", marginBottom: 16,
        border: "1px solid " + (user?.isVip ? "#f0dcc0" : "#ead9c0"),
        display: "flex", justifyContent: "space-between", alignItems: "center",
        cursor: "pointer",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CrownOutlined style={{ color: user?.isVip ? "#e8965e" : "#c4a68a", fontSize: 20 }} />
          <div>
            <Text style={{ color: "#5C4033", fontSize: 14, display: "block" }}>
              {user?.isVip ? tierLabel + "浼氬憳" : "鍏嶈垂鐢ㄦ埛"}
            </Text>
            {user?.isVip && user?.membershipExpireAt && (
              <Text style={{ color: "#B08968", fontSize: 11 }}>
                鍒版湡 {new Date(user.membershipExpireAt).toLocaleDateString("zh-CN")}
              </Text>
            )}
          </div>
        </div>
        <Tag color={user?.isVip ? "#e8965e" : "#c4a68a"} style={{ borderRadius: 8 }}>
          {user?.isVip ? "宸插紑閫? : "鍗囩骇"}
        </Tag>
      </div>

      {/* Stats */}
      <div style={{ background: "#fdf8f0", borderRadius: 16, padding: "16px 20px", marginBottom: 16, border: "1px solid #ead9c0" }}>
        <Text style={{ color: "#B08968", fontSize: 12, display: "block", marginBottom: 12 }}>
          <BookOutlined style={{ marginRight: 6 }} />鏁版嵁缁熻
        </Text>
        <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
          {[
            { icon: <MessageOutlined />, value: stats?.conversationTurns ?? 0, label: "鑱婂ぉ杞暟" },
            { icon: <TeamOutlined />, value: stats?.characterCount ?? 0, label: "鍒涘缓瑙掕壊" },
            { icon: <StarOutlined />, value: stats?.memoryCount ?? 0, label: "璁板繂鏁伴噺" },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ color: "#B08968", fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
              <Text strong style={{ color: "#5C4033", fontSize: 16, fontFamily: "'Georgia',serif", display: "block" }}>
                {s.value}
              </Text>
              <Text style={{ color: "#B08968", fontSize: 10 }}>{s.label}</Text>
            </div>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div style={{ background: "#fdf8f0", borderRadius: 16, overflow: "hidden", border: "1px solid #ead9c0" }}>
        {[
          { icon: <CrownOutlined />, label: "浼氬憳涓績", color: "#e8965e", path: "/membership" },
          { icon: <GiftOutlined />, label: "鍏呭€间腑蹇?, color: "#8b5cf6", path: "/recharge" },
          { icon: <WalletOutlined />, label: "閽卞寘璁板綍", color: "#B08968", path: "/profile/wallet-history" },
          { icon: <SettingOutlined />, label: "璁剧疆", color: "#B08968", path: "/profile/settings" },
        ].map((item, i) => (
          <div key={i} onClick={() => router.push(item.path)} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", cursor: "pointer",
            borderBottom: i < 3 ? "1px solid #ead9c0" : "none",
          }}>
            <span style={{ color: item.color, fontSize: 18 }}>{item.icon}</span>
            <Text style={{ color: "#5C4033", fontSize: 14, flex: 1 }}>{item.label}</Text>
            <RightOutlined style={{ color: "#c4a68a", fontSize: 12 }} />
          </div>
        ))}
      </div>

      <Button block type="text" icon={<LogoutOutlined />} onClick={handleLogout}
        style={{ marginTop: 24, color: "#c4a68a", height: 44, borderRadius: 16, fontSize: 14 }}>
        閫€鍑虹櫥褰?      </Button>
    </Content>
  );
}
