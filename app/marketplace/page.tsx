"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BackButton from "../../components/navigation/BackButton";
import BottomNav from "../../components/navigation/BottomNav";
import { Layout, Card, Typography, Button, Tag, Row, Col, Avatar, Input, message as antMsg } from "antd";
import { ArrowLeftOutlined, ShoppingCartOutlined, FireOutlined, StarOutlined, CrownOutlined } from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;
const { Search } = Input;

interface MarketplaceCharacter {
  id: string;
  name: string;
  persona: string;
  avatar: string;
  tier: string;
  price: number;
  salesCount: number;
  creatorName: string;
  listedAt: string;
}

const TIER_LABELS: Record<string, string> = { basic: "相识", premium: "知己", story: "羁绊" };

export default function MarketplacePage() {
  const router = useRouter();
  const [characters, setCharacters] = useState<MarketplaceCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"popular" | "newest" | "price">("popular");

  useEffect(() => {
    fetch("/api/marketplace?sort=" + sortBy)
      .then((r) => r.json())
      .then((data) => setCharacters(data.characters ?? []))
      .finally(() => setLoading(false));
  }, [sortBy]);

  const handlePurchase = async (charId: string, price: number) => {
    try {
      const res = await fetch("/api/marketplace/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: charId }),
      });
      const data = await res.json();
      if (res.ok) {
        antMsg.success("购买成功！角色已添加到你的角色列表");
        router.push("/characters");
      } else {
        antMsg.error(data.error ?? "购买失败");
      }
    } catch {
      antMsg.error("网络连接失败");
    }
  };

  return (
    <>
    <Content className="page-scroll" style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 100px", minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24, gap: 12 }}>
        <BackButton />
        <Title level={4} style={{
          margin: 0, color: "#5C4033", fontWeight: 400, flex: 1,
          fontFamily: "'Georgia','Noto Serif SC',serif", letterSpacing: 3,
        }}>
          角色商店
        </Title>
      </div>

      {/* Sort tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflow: "auto" }}>
        {[
          { key: "popular", label: "热门", icon: <FireOutlined /> },
          { key: "newest", label: "最新", icon: <StarOutlined /> },
          { key: "price", label: "价格", icon: <CrownOutlined /> },
        ].map((tab) => (
          <Button
            key={tab.key}
            type={sortBy === tab.key ? "primary" : "default"}
            icon={tab.icon}
            onClick={() => setSortBy(tab.key as typeof sortBy)}
            style={{
              borderRadius: 16,
              background: sortBy === tab.key
                ? "linear-gradient(135deg, #f6c177, #f0a860)"
                : "#fdf8f0",
              border: sortBy === tab.key ? "none" : "1px solid #ead9c0",
              color: sortBy === tab.key ? "#fffdf9" : "#B08968",
              fontWeight: 400,
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 64 }}>
          <Text style={{ color: "#B08968", fontSize: 15 }}>正在浏览角色商店……</Text>
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {characters.map((char) => (
            <Col key={char.id} xs={24} sm={12} md={8} lg={6}>
              <div style={{
                background: "#fdf8f0",
                borderRadius: 16,
                border: "1px solid #ead9c0",
                overflow: "hidden",
                transition: "all 0.3s ease",
              }}
                className="photo-card"
              >
                <div style={{ padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <Avatar size={48} style={{
                      background: "#fdf0e0", color: "#B08968", fontSize: 20,
                      borderRadius: 14, flexShrink: 0,
                    }}>
                      {char.avatar}
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text strong style={{ color: "#5C4033", fontSize: 15, display: "block" }}>
                        {char.name}
                      </Text>
                      <Text style={{ color: "#B08968", fontSize: 11 }}>
                        {char.creatorName}
                      </Text>
                    </div>
                  </div>
                  <Paragraph style={{
                    color: "#8b7355", fontSize: 12, margin: 0,
                    lineHeight: 1.5, marginBottom: 12,
                  }} ellipsis={{ rows: 2 }}>
                    {char.persona}
                  </Paragraph>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <Text strong style={{
                        color: "#e8965e", fontSize: 20, fontFamily: "'Georgia',serif",
                      }}>
                        {char.price}
                      </Text>
                      <Text style={{ color: "#B08968", fontSize: 11, marginLeft: 4 }}>星钻</Text>
                      <Tag style={{
                        marginLeft: 8, fontSize: 10, borderRadius: 6,
                        background: "transparent", color: "#B08968", border: "1px solid #ead9c0",
                      }}>
                        {TIER_LABELS[char.tier] ?? char.tier}
                      </Tag>
                    </div>
                    <Button
                      size="small"
                      icon={<ShoppingCartOutlined />}
                      onClick={() => handlePurchase(char.id, char.price)}
                      style={{
                        borderRadius: 12,
                        background: "linear-gradient(135deg, #f6c177, #f0a860)",
                        border: "none", color: "#fffdf9", fontWeight: 400,
                      }}
                    >
                      获取
                    </Button>
                  </div>
                  <Text style={{ color: "#c4a68a", fontSize: 10, display: "block", marginTop: 8 }}>
                    已售 {char.salesCount} 次
                  </Text>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      )}

      {!loading && characters.length === 0 && (
        <div style={{ textAlign: "center", padding: 64 }}>
          <Text style={{ color: "#B08968", fontSize: 14 }}>
            商店暂无角色，去创建一个吧 ✨
          </Text>
        </div>
      )}
    </Content>
      <BottomNav />
    </>
  );
}
