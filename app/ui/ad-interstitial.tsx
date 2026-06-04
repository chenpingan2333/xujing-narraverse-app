"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal, Button, Typography } from "antd";
import { PlayCircleOutlined, GiftOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface AdInterstitialProps {
  open: boolean;
  adType: "character_create" | "conversation_continue";
  rewardStars: number;
  onComplete: () => void;
  onDismiss: () => void;
}

const AD_CONTENT: Record<string, { title: string; description: string; emoji: string }> = {
  character_create: {
    title: "点亮星光，创造角色",
    description: "观看一段小小的星光故事，即可免费创建一个新角色。你的每一次凝望，都为这个世界增添一抹温度。",
    emoji: "✨",
  },
  conversation_continue: {
    title: "暖意续章",
    description: "故事已经写了很长很长。稍作停留，让星光为你续上新的篇章。",
    emoji: "📖",
  },
};

export default function AdInterstitial({ open, adType, rewardStars, onComplete, onDismiss }: AdInterstitialProps) {
  const [progress, setProgress] = useState(0);
  const [watching, setWatching] = useState(false);
  const [completed, setCompleted] = useState(false);
  const DURATION_MS = 5000;
  const TICK_MS = 50;

  useEffect(() => {
    if (!open) {
      setProgress(0);
      setWatching(false);
      setCompleted(false);
    }
  }, [open]);

  useEffect(() => {
    if (!watching || completed) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (TICK_MS / DURATION_MS) * 100;
        if (next >= 100) {
          clearInterval(interval);
          setCompleted(true);
          return 100;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [watching, completed]);

  const handleStartWatch = () => {
    setWatching(true);
  };

  const handleClaim = () => {
    onComplete();
  };

  const content = AD_CONTENT[adType];

  return (
    <Modal
      open={open}
      footer={null}
      closable={!watching || completed}
      onCancel={onDismiss}
      width={400}
      styles={{
        body: { textAlign: "center", padding: "32px 24px" },
        content: { borderRadius: 20, background: "#fdf8f0" },
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 56, marginBottom: 12,
          animation: watching && !completed ? "gentleFloat 2s ease-in-out infinite" : "none",
        }}>
          {content.emoji}
        </div>
        <Title level={4} style={{
          color: "#5C4033", fontWeight: 400,
          fontFamily: "'Georgia','Noto Serif SC',serif", marginBottom: 8,
        }}>
          {content.title}
        </Title>
        <Text style={{ color: "#B08968", fontSize: 13, lineHeight: 1.8, display: "block", marginBottom: 20 }}>
          {content.description}
        </Text>
      </div>

      {!watching && !completed && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleStartWatch}
            style={{
              background: "linear-gradient(135deg, #f6c177, #f0a860)", border: "none",
              borderRadius: 20, height: 44, paddingLeft: 32, paddingRight: 32,
              fontSize: 15, fontWeight: 400, color: "#fffdf9",
              boxShadow: "0 2px 16px rgba(240,168,96,0.30)",
            }}
          >
            观看星光故事
          </Button>
          <Button type="link" onClick={onDismiss} style={{ color: "#c4a68a", fontSize: 13 }}>
            放弃创建
          </Button>
        </div>
      )}

      {watching && !completed && (
        <div style={{ padding: "12px 0" }}>
          <div style={{
            width: "100%", height: 6, borderRadius: 3, background: "#f0e5d5",
            overflow: "hidden", marginBottom: 12,
          }}>
            <div style={{
              height: "100%", borderRadius: 3,
              background: "linear-gradient(90deg, #f6c177, #f0a860, #e8965e)",
              width: progress + "%",
              transition: "width 0.05s linear",
            }} />
          </div>
          <Text style={{ color: "#B08968", fontSize: 13 }}>
            星光正在汇聚……
          </Text>
          <div style={{ position: "relative", height: 40, marginTop: 8 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="xj-float" style={{
                position: "absolute",
                left: (20 + i * 15) + "%",
                top: 8,
                width: 4 + (i % 3) * 2,
                height: 4 + (i % 3) * 2,
                borderRadius: "50%",
                background: "rgba(246,193,119,0.3)",
                animationDelay: (i * 0.3) + "s",
                animationDuration: (2 + i) + "s",
              }} />
            ))}
          </div>
        </div>
      )}

      {completed && (
        <div>
          <div style={{
            background: "linear-gradient(135deg, #fef5e7, #fdf0e0)",
            borderRadius: 16, padding: "20px 16px", marginBottom: 20,
            border: "1px solid #f0dcc0",
          }}>
            <GiftOutlined style={{ fontSize: 28, color: "#e8965e", marginBottom: 8 }} />
            <Text style={{ color: "#8b7355", fontSize: 14, display: "block", marginBottom: 4 }}>
              星光汇聚完成
            </Text>
            <Text strong style={{ color: "#e8965e", fontSize: 18, fontFamily: "'Georgia',serif" }}>
              +{rewardStars} 星钻
            </Text>
          </div>
          <Button
            type="primary"
            onClick={handleClaim}
            style={{
              background: "linear-gradient(135deg, #f6c177, #f0a860)", border: "none",
              borderRadius: 20, height: 44, paddingLeft: 32, paddingRight: 32,
              fontSize: 15, fontWeight: 400, color: "#fffdf9",
            }}
          >
            领取并继续
          </Button>
        </div>
      )}
    </Modal>
  );
}
