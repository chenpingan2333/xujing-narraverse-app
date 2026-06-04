"use client";

import { useMemo } from "react";
import { Typography } from "antd";
import { HeartOutlined } from "@ant-design/icons";
import {
  buildRelationshipUIModel,
  getWarmthGradient,
  getTrendEmoji,
  type RelationshipUIModel,
} from "./ui-model";

const { Text } = Typography;

interface LivingRelationshipCardProps {
  affection: number;
  trust: number;
  intimacy: number;
  previousTemp?: number;
  reason?: string;
}

/**
 * LivingRelationshipCard — a breathing, visual representation
 * of the relationship state. Designed to feel like a living
 * record rather than a dashboard.
 *
 * Three visual dimensions:
 *   Warmth bar — shows affection as temperature
 *   Stability line — shows trust as a steady pulse
 *   Proximity ring — shows intimacy as visual closeness
 */
export default function LivingRelationshipCard({
  affection, trust, intimacy, previousTemp, reason,
}: LivingRelationshipCardProps) {
  const model = useMemo(
    () => buildRelationshipUIModel(affection, trust, intimacy, previousTemp),
    [affection, trust, intimacy, previousTemp],
  );

  const trendEmoji = getTrendEmoji(model.trend);

  return (
    <div style={{
      background: "#fdf8f0", borderRadius: 18, padding: 20,
      border: "1px solid #ead9c0",
      transition: "all 0.6s ease",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <Text style={{ color: "#B08968", fontSize: 12 }}>
          <HeartOutlined style={{ marginRight: 6 }} />关系状态
        </Text>
        <Text style={{ color: model.trend === "warming" ? "#e8965e" : model.trend === "cooling" ? "#8b7355" : "#B08968", fontSize: 12 }}>
          {trendEmoji} {model.trend === "warming" ? "升温中" : model.trend === "cooling" ? "降温中" : "稳定"}
        </Text>
      </div>

      {/* Temperature gauge */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{
          fontSize: 42, fontWeight: 300, color: "#e8965e",
          fontFamily: "'Georgia', serif", lineHeight: 1,
          transition: "color 0.6s ease",
        }}>
          {model.overallTemp}°
        </div>
        <Text style={{ color: "#B08968", fontSize: 13, display: "block", marginTop: 4 }}>
          {model.phaseLabel}
        </Text>
      </div>

      {/* Warmth bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ fontSize: 11, color: "#B08968" }}>温度</Text>
          <Text style={{ fontSize: 11, color: "#e8965e" }}>{model.warmth}</Text>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "#f0e5d5", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 3,
            width: `${model.warmth}%`,
            background: getWarmthGradient(model.warmth),
            transition: "width 1s ease",
          }} />
        </div>
      </div>

      {/* Stability line */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ fontSize: 11, color: "#B08968" }}>稳定</Text>
          <Text style={{ fontSize: 11, color: "#d4945c" }}>{model.stability}</Text>
        </div>
        <div style={{
          height: 3, borderRadius: 2, background: "#f0e5d5",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 2,
            width: `${model.stability}%`,
            background: "linear-gradient(90deg, #d4b896, #d4945c)",
            transition: "width 1s ease",
          }} />
          {/* Pulse dot at the end of the line */}
          <div style={{
            position: "absolute", top: -2, left: `${model.stability}%`,
            width: 7, height: 7, borderRadius: "50%",
            background: "#d4945c",
            transform: "translateX(-50%)",
            animation: "warmGlowPulse 2s ease-in-out infinite",
            transition: "left 1s ease",
          }} />
        </div>
      </div>

      {/* Proximity indicator */}
      <div style={{ marginBottom: reason ? 14 : 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <Text style={{ fontSize: 11, color: "#B08968" }}>距离</Text>
          <Text style={{ fontSize: 11, color: "#f0a860" }}>{model.proximity}</Text>
        </div>
        <div style={{
          display: "flex", justifyContent: "center", gap: 4, padding: "4px 0",
        }}>
          {[0, 1, 2, 3, 4].map((i) => {
            const threshold = (i + 1) * 20;
            const filled = model.proximity >= threshold;
            return (
              <div key={i} style={{
                width: 12, height: 12, borderRadius: "50%",
                background: filled ? getWarmthGradient(threshold) : "#f0e5d5",
                transition: "all 0.6s ease",
                transform: filled ? `scale(${1 + model.proximity / 200})` : "scale(1)",
              }} />
            );
          })}
        </div>
      </div>

      {/* Relationship change reason */}
      {reason && (
        <div style={{
          background: "#fef5e7", borderRadius: 10, padding: "8px 12px",
          border: "1px solid #f0dcc0", marginTop: 4,
        }}>
          <Text style={{ color: "#8b7355", fontSize: 11, fontStyle: "italic" }}>{reason}</Text>
        </div>
      )}
    </div>
  );
}