"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BackButton from "../../components/navigation/BackButton";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import { Layout, Card, Typography, Button, Tag, Row, Col, Avatar, Input, message as antMsg } from "antd";
import { ArrowLeftOutlined, ShoppingCartOutlined, FireOutlined, StarOutlined, CrownOutlined, CheckCircleFilled, VerifiedOutlined } from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;

interface MarketplaceCharacter {
  id: string;
  name: string;
  persona: string;
  displayDescription?: string;
  avatar: string;
  tier: string;
  displayName?: string;
  price: number;
  salesCount: number;
  creatorName: string;
  listedAt: string;
  tags: string[];
  verified: boolean;
  official: boolean;
}

const TIER_LABELS: Record<string, string> = { basic: "相识", premium: "知己", story: "羁绊" };

const POPULAR_TAGS = ["古风", "校园", "职场", "修仙", "西幻", "赛博朋克", "悬疑", "末日", "猫娘", "女帝", "AI"];

export default function MarketplacePage() {
  const router = useRouter();
  const [characters, setCharacters] = useState<MarketplaceCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("popular");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ sort: sortBy });
    if (activeTag) params.set("tag", activeTag);
    fetch("/api/marketplace?" + params.toString())
      .then((r) => r.json())
      .then((data) => setCharacters(data.characters ?? []))
      .finally(() => setLoading(false));
  }, [sortBy, activeTag]);

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
      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflow: "auto", flexWrap: "wrap" }}>
        {[
          { key: "popular", label: "热门", icon: <FireOutlined /> },
          { key: "newest", label: "最新", icon: <StarOutlined /> },
          { key: "price_asc", label: "价格↑", icon: <CrownOutlined /> },
          { key: "price_desc", label: "价格↓", icon: <CrownOutlined /> },
        ].map((tab) => (
          <Button
            key={tab.key}
            type={sortBy === tab.key ? "primary" : "default"}
            icon={tab.icon}
            onClick={() => setSortBy(tab.key)}
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

      {/* Tag filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, overflow: "auto", flexWrap: "wrap" }}>
        <Tag
          style={{
            cursor: "pointer", borderRadius: 12, padding: "2px 12px",
            background: !activeTag ? "#f0a860" : "transparent",
            color: !activeTag ? "#fff" : "#B08968",
            border: !activeTag ? "none" : "1px solid #ead9c0",
          }}
          onClick={() => setActiveTag(null)}
        >
          全部
        </Tag>
        {POPULAR_TAGS.map((tag) => (
          <Tag
            key={tag}
            style={{
              cursor: "pointer", borderRadius: 12, padding: "2px 12px",
              background: activeTag === tag ? "#f0a860" : "transparent",
              color: activeTag === tag ? "#fff" : "#B08968",
              border: activeTag === tag ? "none" : "1px solid #ead9c0",
            }}
            onClick={() => setActiveTag(tag)}
          >
            {tag}
          </Tag>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 64 }}>
          <Text style={{ color: "#B08968", fontSize: 15 }}>正在浏览角色商店…</Text>
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
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Text strong style={{ color: "#5C4033", fontSize: 15 }}>
                          {char.displayName || char.name}
                        </Text>
                        {char.official && (
                          <VerifiedOutlined style={{ color: "#f0a860", fontSize: 14 }} title="叙境官方" />
                        )}
                        {char.verified && !char.official && (
                          <CheckCircleFilled style={{ color: "#52c41a", fontSize: 12 }} title="已验证" />
                        )}
                      </div>
                      <Text style={{ color: "#B08968", fontSize: 11 }}>
                        {char.creatorName}
                      </Text>
                    </div>
                  </div>
                  <Paragraph style={{
                    color: "#8b7355", fontSize: 12, margin: 0,
                    lineHeight: 1.5, marginBottom: 10,
                  }} ellipsis={{ rows: 2 }}>
                    {char.displayDescription || char.persona}
                  </Paragraph>
                  {/* Tags */}
                  {char.tags && char.tags.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
                      {char.tags.slice(0, 3).map((t) => (
                        <Tag key={t} style={{
                          fontSize: 10, borderRadius: 6, margin: 0,
                          background: activeTag === t ? "#fdf0e0" : "transparent",
                          color: "#B08968", border: "1px solid #ead9c0",
                          cursor: "pointer",
                        }}
                          onClick={(e) => { e.stopPropagation(); setActiveTag(t); }}
                        >
                          {t}
                        </Tag>
                      ))}
                    </div>
                  )}
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
            {activeTag ? `没有找到"${activeTag}"标签的角色` : "商店暂无角色，去创建一个吧 ✨"}
          </Text>
        </div>
      )}
    </Content>
      
    </>
  );
}