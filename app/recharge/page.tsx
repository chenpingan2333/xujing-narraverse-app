"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BackButton from "../../components/navigation/BackButton";
import BottomNav from "../../components/navigation/BottomNav";
import { Layout, Typography, Button, Tag, Row, Col, Modal, Input, message as antMsg } from "antd";
import { ArrowLeftOutlined, CopyOutlined, WalletOutlined, WechatOutlined, AlipayCircleOutlined } from "@ant-design/icons";
import { RECHARGE_PACKAGES, ECONOMY, formatCNY } from "@/config/economy";

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;

export default function RechargePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<"wechat" | "alipay">("wechat");

  useEffect(() => {
    fetch("/api/auth/session/me").then((r) => r.json()).then((data) => {
      if (data.user) setUser(data.user);
    }).catch(() => {});
  }, []);

  const uid = user?.uidDisplay ?? "NAR_000000";

  const handleSelect = (stars: number, method: "wechat" | "alipay") => {
    setSelectedPackage(stars);
    setPayMethod(method);
    setPayModalOpen(true);

    // Record order
    fetch("/api/recharge/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stars, method }),
    }).catch(() => {});
  };

  const copyUID = () => {
    navigator.clipboard.writeText(uid).then(() => {
      antMsg.success("用户ID已复制");
    }).catch(() => {
      antMsg.info("UID: " + uid);
    });
  };

  return (
    <>
    <Content className="page-scroll" style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px 100px", minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24, gap: 12 }}>
        <BackButton />
        <Title level={4} style={{ margin: 0, color: "#5C4033", fontWeight: 400, flex: 1,
          fontFamily: "'Georgia','Noto Serif SC',serif", letterSpacing: 3 }}>
          充值星钻
        </Title>
      </div>

      <Paragraph style={{ textAlign: "center", color: "#B08968", fontSize: 13, marginBottom: 24, lineHeight: 1.8 }}>
        {ECONOMY.STAR_PER_CNY} 星钻 = {ECONOMY.CNY_SYMBOL}1<br />
        选择套餐后扫码付款，开发者将手动发放星钻
      </Paragraph>

      {/* UID Display */}
      <div style={{
        background: "linear-gradient(135deg, #2a1a3e, #1a0a2e)", borderRadius: 20, padding: "20px",
        marginBottom: 24, color: "#fff", textAlign: "center",
      }}>
        <Text style={{ color: "#b8a0d0", fontSize: 11, display: "block", marginBottom: 6 }}>我的用户ID</Text>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Text strong style={{ color: "#e8d0ff", fontSize: 20, fontFamily: "monospace", letterSpacing: 1 }}>
            {uid}
          </Text>
          <Button type="text" icon={<CopyOutlined />} onClick={copyUID}
            style={{ color: "#b8a0d0", fontSize: 16 }} />
        </div>
      </div>

      {/* Packages */}
      <Text style={{ color: "#B08968", fontSize: 12, display: "block", marginBottom: 12 }}>选择充值套餐</Text>
      <Row gutter={[12, 12]}>
        {RECHARGE_PACKAGES.map((pkg) => (
          <Col key={pkg.stars} xs={12} sm={8}>
            <div onClick={() => {}} style={{
              background: pkg.recommended
                ? "linear-gradient(135deg, #2a1a3e, #1a0a2e)"
                : "#fdf8f0",
              borderRadius: 16, padding: "16px 12px", textAlign: "center",
              border: pkg.recommended ? "2px solid #8b5cf6" : "1px solid #ead9c0",
              cursor: "pointer", transition: "all 0.2s",
              position: "relative",
            }}>
              {pkg.recommended && (
                <Tag color="#8b5cf6" style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                  borderRadius: 8, fontSize: 10, border: "none" }}>推荐</Tag>
              )}
              <Text strong style={{
                color: pkg.recommended ? "#e8d0ff" : "#e8965e",
                fontSize: 24, fontFamily: "'Georgia',serif", display: "block",
              }}>
                {pkg.stars}
              </Text>
              <Text style={{ color: pkg.recommended ? "#b8a0d0" : "#B08968", fontSize: 12, display: "block" }}>
                星钻
              </Text>
              <Text style={{ color: pkg.recommended ? "#8b5cf6" : "#c4a68a", fontSize: 11 }}>
                {ECONOMY.CNY_SYMBOL}{pkg.price}
              </Text>
              <div style={{ marginTop: 12, display: "flex", gap: 6, justifyContent: "center" }}>
                <Button size="small" onClick={() => handleSelect(pkg.stars, "wechat")}
                  style={{ borderRadius: 10, fontSize: 11, background: "#07c160", border: "none", color: "#fff" }}>
                  <WechatOutlined /> 微信
                </Button>
                <Button size="small" onClick={() => handleSelect(pkg.stars, "alipay")}
                  style={{ borderRadius: 10, fontSize: 11, background: "#1677ff", border: "none", color: "#fff" }}>
                  <AlipayCircleOutlined /> 支付宝
                </Button>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Bottom note */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#fdf8f0", borderTop: "1px solid #ead9c0",
        padding: "12px 20px", textAlign: "center",
      }}>
        <Text style={{ color: "#c4a68a", fontSize: 11 }}>
          充值后由开发者手动发放星钻 · 如10分钟内未到账请联系 rain-1539
        </Text>
      </div>

      {/* Payment Modal */}
      <Modal
        open={payModalOpen}
        onCancel={() => setPayModalOpen(false)}
        footer={null}
        width={340}
        styles={{ body: { textAlign: "center", padding: "24px" }, content: { borderRadius: 20 } }}
      >
        <Title level={5} style={{ color: "#5C4033", fontWeight: 400, marginBottom: 4 }}>
          {payMethod === "wechat" ? "微信支付" : "支付宝"}
        </Title>
        <Text style={{ color: "#B08968", fontSize: 12, display: "block", marginBottom: 16 }}>
          {selectedPackage} 星钻 · {ECONOMY.CNY_SYMBOL}{((selectedPackage ?? 0) / ECONOMY.STAR_PER_CNY).toFixed(1)}
        </Text>

        {/* QR Code */}
        <div style={{
          width: 200, height: 200, margin: "0 auto 16px",
          background: "#f5f0e8", borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
          <img
            src={payMethod === "wechat" ? "/pay/wechat.jpg" : "/pay/alipay.jpg"}
            alt={payMethod === "wechat" ? "微信收款码" : "支付宝收款码"}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>

        <div style={{
          background: "linear-gradient(135deg, #2a1a3e, #1a0a2e)",
          borderRadius: 12, padding: "12px 16px", marginBottom: 12,
        }}>
          <Text style={{ color: "#b8a0d0", fontSize: 11, display: "block" }}>
            付款时请记住用户ID
          </Text>
          <Text strong style={{ color: "#e8d0ff", fontSize: 16, fontFamily: "monospace" }}>
            {uid}
          </Text>
          <Button type="text" size="small" icon={<CopyOutlined />} onClick={copyUID}
            style={{ color: "#b8a0d0", fontSize: 12, marginTop: 4 }}>
            复制ID
          </Button>
        </div>

        <Text style={{ color: "#c4a68a", fontSize: 11 }}>
          付款完成后关闭此窗口，等待开发者发放星钻
        </Text>
      </Modal>
    </Content>
      <BottomNav />
    </>
  );
}
