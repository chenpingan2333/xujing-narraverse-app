"use client";

import { useState } from "react";
import { Layout, Typography, Button, Input, Card, message as antMsg, Tag } from "antd";
import { SearchOutlined, GiftOutlined, WalletOutlined } from "@ant-design/icons";
import { ECONOMY } from "@/config/economy";

const { Title, Text } = Typography;
const { Content } = Layout;

const STAR_AMOUNTS = [990, 1990, 2990, 6990, 19990];

export default function AdminWalletPage() {
  const [search, setSearch] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [granting, setGranting] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/admin/wallet?q=" + encodeURIComponent(search));
      const data = await res.json();
      if (data.user) {
        setFoundUser(data.user);
      } else {
        antMsg.warning("未找到用户");
        setFoundUser(null);
      }
    } catch { antMsg.error("搜索失败"); }
    finally { setSearching(false); }
  };

  const handleGrant = async (amount: number) => {
    if (!foundUser) return;
    setGranting(amount);
    try {
      const res = await fetch("/api/admin/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: foundUser.id, amount, reason: "管理员手动充值" }),
      });
      const data = await res.json();
      if (res.ok) {
        antMsg.success("已发放 " + amount + " 星钻给 " + (foundUser.name ?? foundUser.email));
        setFoundUser({ ...foundUser, starDiamonds: (foundUser.starDiamonds ?? 0) + amount });
      } else {
        antMsg.error(data.error ?? "操作失败");
      }
    } catch { antMsg.error("操作失败"); }
    finally { setGranting(null); }
  };

  return (
    <Content style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px", minHeight: "100vh" }} className="page-scroll">
      <Title level={4} style={{ color: "#5C4033", fontWeight: 400, fontFamily: "'Georgia','Noto Serif SC',serif", marginBottom: 24 }}>
        <WalletOutlined style={{ marginRight: 8, color: "#8b5cf6" }} />管理员钱包
      </Title>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Input
          placeholder="搜索 UID / 邮箱 / 用户名"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onPressEnter={handleSearch}
          style={{ borderRadius: 12, flex: 1 }}
        />
        <Button icon={<SearchOutlined />} onClick={handleSearch} loading={searching}
          style={{ borderRadius: 12, background: "#8b5cf6", border: "none", color: "#fff" }}>
          搜索
        </Button>
      </div>

      {foundUser && (
        <div style={{
          background: "#fdf8f0", borderRadius: 16, padding: 20, marginBottom: 20,
          border: "1px solid #ead9c0",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <Text strong style={{ color: "#5C4033", fontSize: 15, display: "block" }}>
                {foundUser.name ?? "未命名"}
              </Text>
              <Text style={{ color: "#B08968", fontSize: 12 }}>
                {foundUser.email} · UID: {foundUser.uidDisplay}
              </Text>
            </div>
            <Tag color="#8b5cf6" style={{ borderRadius: 8 }}>
              <GiftOutlined /> {foundUser.starDiamonds ?? 0} 星钻
            </Tag>
          </div>

          <Text style={{ color: "#B08968", fontSize: 12, display: "block", marginBottom: 10 }}>选择充值金额</Text>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {STAR_AMOUNTS.map((amount) => (
              <Button key={amount} loading={granting === amount}
                onClick={() => handleGrant(amount)}
                style={{
                  borderRadius: 12, fontSize: 13,
                  background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                  border: "none", color: "#fff",
                }}>
                <GiftOutlined /> {amount} 星钻
              </Button>
            ))}
          </div>
        </div>
      )}

      {!foundUser && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Text style={{ color: "#B08968", fontSize: 13 }}>
            输入用户信息搜索，可搜索 UID、邮箱或用户名
          </Text>
        </div>
      )}
    </Content>
  );
}
