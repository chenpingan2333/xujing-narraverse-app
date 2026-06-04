"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout, Card, Typography, Button, Tag, Row, Col } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;

interface World {
  id: string;
  name: string;
  tier: string;
  worldType: string;
  mode: "simple" | "advanced";
  description: string;
}

const TIER_LABELS: Record<string, string> = { basic: "入门", premium: "深度", story: "史诗" };
const TYPE_META: Record<string, { label: string; emoji: string; gradient: string; accent: string }> = {
  fantasy: {
    label: "奇幻", emoji: "🏰",
    gradient: "linear-gradient(160deg, #fdf0e0 0%, #fbe8d8 40%, #e8d5c0 100%)",
    accent: "#8b6f4e",
  },
  scifi: {
    label: "科幻", emoji: "🚀",
    gradient: "linear-gradient(160deg, #f0ece6 0%, #e8e4dc 40%, #d4cfc5 100%)",
    accent: "#5a6370",
  },
  wuxia: {
    label: "武侠", emoji: "⚔️",
    gradient: "linear-gradient(160deg, #fef0ea 0%, #fce5d8 40%, #e8ccc0 100%)",
    accent: "#a06050",
  },
};

function WorldsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/worlds")
      .then((r) => r.json())
      .then(setWorlds)
      .finally(() => setLoading(false));
  }, []);

  const selectWorld = (world: World) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("worldId", world.id);
    params.set("worldName", world.name);
    params.set("worldType", world.worldType);
    params.set("worldMode", world.mode);
    router.push(`/chat?${params.toString()}`);
  };

  const skipWorld = () => {
    router.push(`/chat?${searchParams.toString()}`);
  };

  return (
    <Content style={{ maxWidth: 960, margin: "0 auto", padding: 32, minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => router.push("/characters")}
          style={{ color: "#B08968" }}>返回</Button>
        <Title level={2} style={{ margin: 0, color: "#5C4033", fontWeight: 400, fontFamily: "'Georgia','Noto Serif SC',serif", letterSpacing: 4 }}>
          世界故事
        </Title>
        <Button type="text" onClick={skipWorld} style={{ color: "#B08968" }}>暂且随意走走</Button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 64 }}>
          <Text style={{ color: "#B08968", fontSize: 15 }}>正在翻开世界之书……</Text>
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          {worlds.map((w) => {
            const meta = TYPE_META[w.worldType] ?? { label: w.worldType, emoji: "📖", gradient: "#fdf8f0", accent: "#B08968" };
            return (
              <Col key={w.id} xs={24} sm={12} md={8}>
                <div
                  className="world-story-card xj-soft-in"
                  onClick={() => selectWorld(w)}
                >
                  {/* Cover area */}
                  <div style={{
                    height: 100, display: "flex", alignItems: "center", justifyContent: "center",
                    background: meta.gradient, fontSize: 48,
                    borderBottom: "1px solid #e8d5c0",
                  }}>
                    {meta.emoji}
                  </div>
                  {/* Content */}
                  <div style={{ padding: "18px 22px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <Title level={4} style={{
                          margin: 0, color: "#5C4033", fontSize: 18, fontWeight: 400,
                          fontFamily: "'Georgia','Noto Serif SC',serif",
                        }}>
                          {w.name}
                        </Title>
                        <Text style={{ color: meta.accent, fontSize: 12, fontWeight: 500, fontStyle: "italic" }}>
                          {meta.label} · {w.mode === "advanced" ? "深度叙事" : "轻松漫游"}
                        </Text>
                      </div>
                      <Tag style={{
                        background: meta.accent + "12",
                        color: meta.accent, border: "none",
                        fontSize: 11, borderRadius: 8,
                      }}>
                        {TIER_LABELS[w.tier]}
                      </Tag>
                    </div>
                    <Paragraph style={{
                      color: "#8b7355", fontSize: 13, margin: 0,
                      lineHeight: 1.6, fontStyle: "italic",
                    }}>
                      {w.description}
                    </Paragraph>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      )}
    </Content>
  );
}

export default function WorldsPage() {
  return (
    <Suspense fallback={<p style={{ textAlign: "center", color: "#B08968", padding: 48 }}>翻页中……</p>}>
      <WorldsPageInner />
    </Suspense>
  );
}