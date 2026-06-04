"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layout, Typography, Button, Tag, Row, Col, message as antMsg, Modal } from "antd";
import { CrownOutlined, ArrowLeftOutlined, CheckOutlined, StarOutlined, WalletOutlined } from "@ant-design/icons";
import { MEMBERSHIP_PRICES, ECONOMY, formatCNY, formatMonthlyCNY } from "@/config/economy";

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;

interface MembershipPlan {
  key: string;
  name: string;
  price: number;
  firstPrice: number | null;
  period: string;
  perMonth: string;
  features: string[];
  recommended: boolean;
  color: string;
  gradient: string;
}

const PLANS: MembershipPlan[] = [
  {
    key: "monthly", name: "月卡",
    price: MEMBERSHIP_PRICES.monthly,
    firstPrice: MEMBERSHIP_PRICES.monthlyFirst,
    period: "30天", perMonth: formatCNY(MEMBERSHIP_PRICES.monthly),
    features: ["无限世界体验", "10个角色槽位", "高级 AI 模型", "长期记忆（10000条）", "语音对话", "VIP 专属徽章"],
    recommended: false, color: "#B08968",
    gradient: "linear-gradient(160deg, #fdf8f0, #fdf0e0)",
  },
  {
    key: "quarterly", name: "季卡",
    price: MEMBERSHIP_PRICES.quarterly,
    firstPrice: null,
    period: "90天", perMonth: formatMonthlyCNY(MEMBERSHIP_PRICES.quarterly, 3),
    features: ["月卡全部权益", "专属限定角色", "2个付费世界免费", "优先体验新功能", "创作者支持"],
    recommended: true, color: "#e8965e",
    gradient: "linear-gradient(160deg, #fef5e7, #fef0e0)",
  },
  {
    key: "yearly", name: "年卡",
    price: MEMBERSHIP_PRICES.yearly,
    firstPrice: null,
    period: "365天", perMonth: formatMonthlyCNY(MEMBERSHIP_PRICES.yearly, 12),
    features: ["季卡全部权益", "创作者分成 5%", "年度限定角色", "全部付费世界免费", "提前体验新功能", "专属客服通道"],
    recommended: false, color: "#d4786e",
    gradient: "linear-gradient(160deg, #fef5ea, #fef0e5)",
  },
];

export default function MembershipPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [insufficientOpen, setInsufficientOpen] = useState(false);
  const [neededStars, setNeededStars] = useState(0);

  useEffect(() => {
    fetch("/api/auth/session/me").then((r) => r.json()).then((data) => {
      if (data.user) setUser(data.user);
    }).catch(() => {});
  }, []);

  const handlePurchase = async (planKey: string) => {
    setPurchasing(planKey);
    try {
      const res = await fetch("/api/membership/purchase", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (res.ok) {
        antMsg.success("购买成功！欢迎加入叙境 VIP");
        router.push("/profile");
      } else if (data._insufficient) {
        setNeededStars(data._needed);
        setInsufficientOpen(true);
      } else {
        antMsg.error(data.error ?? "购买失败，请稍后重试");
      }
    } catch { antMsg.error("网络连接失败"); }
    finally { setPurchasing(null); }
  };

  const currentTier = user?.membershipTier;
  const PLAN_LABELS: Record<string, string> = { monthly: "月卡", quarterly: "季卡", yearly: "年卡" };
  const hasEverPurchased = user?.firstVipPurchaseAt != null;

  return (
    <Content style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px", minHeight: "100vh", paddingBottom: 40 }} className="page-scroll">
      <div style={{ marginBottom: 32, display: "flex", alignItems: "center", gap: 16 }}>
        <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => router.push("/profile")}
          style={{ color: "#B08968" }}>返回</Button>
        <div style={{ flex: 1 }}>
          <Title level={2} style={{
            margin: 0, color: "#5C4033", fontWeight: 400,
            fontFamily: "'Georgia','Noto Serif SC',serif", letterSpacing: 4, textAlign: "center",
          }}>叙境 VIP</Title>
        </div>
        <div style={{ width: 48 }} />
      </div>

      <Paragraph style={{ textAlign: "center", color: "#B08968", fontSize: 14, marginBottom: 40, lineHeight: 1.8 }}>
        所有消费使用 {ECONOMY.STAR_SYMBOL} 星钻<br />
        {ECONOMY.STAR_PER_CNY} 星钻 = {ECONOMY.CNY_SYMBOL}1
      </Paragraph>

      {currentTier && (
        <div style={{ textAlign: "center", marginBottom: 32, padding: "16px 24px",
          background: "linear-gradient(135deg, #fef5e7, #fdf0e0)", borderRadius: 16, border: "1px solid #f0dcc0" }}>
          <CrownOutlined style={{ fontSize: 20, color: "#e8965e", marginRight: 8 }} />
          <Text style={{ color: "#8b7355", fontSize: 14 }}>
            当前会员：<Text strong style={{ color: "#e8965e" }}>{PLAN_LABELS[currentTier] ?? "VIP"}</Text>
          </Text>
        </div>
      )}

      <Row gutter={[20, 20]} justify="center">
        {PLANS.map((plan) => {
          const isCurrent = currentTier === plan.key;
          const effectivePrice = plan.key === "monthly" && !hasEverPurchased && plan.firstPrice
            ? plan.firstPrice : plan.price;
          const isFirstPurchase = plan.key === "monthly" && !hasEverPurchased && plan.firstPrice != null;

          return (
            <Col key={plan.key} xs={24} sm={8}>
              <div style={{
                position: "relative", background: plan.gradient, borderRadius: 20,
                border: plan.recommended ? "2px solid " + plan.color : "1px solid #ead9c0",
                padding: "28px 20px", height: "100%", display: "flex", flexDirection: "column",
                transition: "all 0.3s ease",
                transform: plan.recommended ? "scale(1.02)" : "scale(1)",
                boxShadow: plan.recommended ? "0 4px 24px " + plan.color + "20" : "0 2px 12px rgba(92,64,51,0.06)",
              }}>
                {plan.recommended && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                    background: "linear-gradient(135deg, " + plan.color + ", #f0a860)", color: "#fffdf9",
                    padding: "4px 16px", borderRadius: 12, fontSize: 12, fontWeight: 500, letterSpacing: 2 }}>
                    推荐
                  </div>
                )}
                {isCurrent && (
                  <Tag color={plan.color} style={{ position: "absolute", top: 12, right: 12, borderRadius: 8 }}>当前</Tag>
                )}

                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}><CrownOutlined style={{ color: plan.color }} /></div>
                  <Title level={4} style={{ margin: 0, color: "#5C4033", fontWeight: 400, fontFamily: "'Georgia','Noto Serif SC',serif" }}>
                    {plan.name}
                  </Title>
                  <Text style={{ color: "#B08968", fontSize: 12 }}>{plan.period}</Text>
                </div>

                {/* Price */}
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  {isFirstPurchase ? (
                    <div>
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 8 }}>
                        <Text delete style={{ color: "#c4a68a", fontSize: 16 }}>
                          {plan.price} 星钻
                        </Text>
                        <Text strong style={{ color: plan.color, fontSize: 36, fontFamily: "'Georgia',serif" }}>
                          {effectivePrice}
                        </Text>
                        <Text style={{ color: "#B08968", fontSize: 14 }}>星钻</Text>
                      </div>
                      <Tag color={plan.color} style={{ marginTop: 6, borderRadius: 8, fontSize: 11 }}>新人专享</Tag>
                      <Text style={{ color: "#B08968", fontSize: 11, display: "block", marginTop: 4 }}>
                        {formatCNY(effectivePrice)}
                      </Text>
                    </div>
                  ) : (
                    <div>
                      <Text strong style={{ color: plan.color, fontSize: 36, fontFamily: "'Georgia',serif" }}>
                        {effectivePrice}
                      </Text>
                      <Text style={{ color: "#B08968", fontSize: 14 }}> 星钻</Text>
                      <Text style={{ color: "#B08968", fontSize: 11, display: "block", marginTop: 4 }}>
                        {plan.perMonth}
                      </Text>
                    </div>
                  )}
                </div>

                {/* Features */}
                <div style={{ flex: 1, marginBottom: 20 }}>
                  {plan.features.map((feat, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13 }}>
                      <CheckOutlined style={{ color: plan.color, fontSize: 11 }} />
                      <Text style={{ color: "#6b5540" }}>{feat}</Text>
                    </div>
                  ))}
                </div>

                <Button block disabled={isCurrent} loading={purchasing === plan.key}
                  onClick={() => handlePurchase(plan.key)}
                  style={{
                    height: 44, borderRadius: 16, fontSize: 15, fontWeight: 400,
                    background: isCurrent ? "#e8d5c0" : "linear-gradient(135deg, " + plan.color + ", " + (plan.recommended ? "#f0a860" : plan.color) + ")",
                    border: "none", color: "#fffdf9",
                    boxShadow: isCurrent ? "none" : "0 2px 12px " + plan.color + "30",
                    fontFamily: "'Georgia','Noto Serif SC',serif", letterSpacing: 2,
                  }}>
                  选择此方案
                </Button>
              </div>
            </Col>
          );
        })}
      </Row>

      <div style={{ textAlign: "center", marginTop: 40 }}>
        <Text style={{ color: "#c4a68a", fontSize: 12 }}>
          <StarOutlined style={{ marginRight: 4 }} />
          所有方案均支持随时取消
        </Text>
      </div>

      {/* Insufficient balance modal */}
      <Modal
        open={insufficientOpen}
        onCancel={() => setInsufficientOpen(false)}
        footer={null}
        width={320}
        styles={{ body: { textAlign: "center", padding: "24px" }, content: { borderRadius: 20 } }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>{ECONOMY.STAR_SYMBOL}</div>
        <Title level={5} style={{ color: "#5C4033", fontWeight: 400 }}>星钻不足</Title>
        <Text style={{ color: "#B08968", fontSize: 13, display: "block", marginBottom: 8 }}>
          还需 {neededStars} 星钻
        </Text>
        <Button block type="primary"
          onClick={() => { setInsufficientOpen(false); router.push("/recharge"); }}
          style={{
            height: 40, borderRadius: 16, marginTop: 12,
            background: "linear-gradient(135deg, #f6c177, #f0a860)", border: "none", color: "#fffdf9",
          }}>
          前往充值
        </Button>
      </Modal>
    </Content>
  );
}
