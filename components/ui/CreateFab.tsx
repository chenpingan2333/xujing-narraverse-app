"use client";

import { PlusOutlined } from "@ant-design/icons";

interface CreateFabProps {
  onClick: () => void;
}

/**
 * CreateFab — 创建角色浮动按钮
 *
 * 固定在右下角，始终可见
 * 圆形按钮，品牌色渐变
 * 适配 BottomNav 高度 (避免被遮挡)
 */
export default function CreateFab({ onClick }: CreateFabProps) {
  return (
    <button
      onClick={onClick}
      aria-label="创建角色"
      style={{
        position: "fixed",
        bottom: "calc(80px + env(safe-area-inset-bottom, 16px))",
        right: 20,
        zIndex: 999,
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #f6c177, #f0a860)",
        border: "none",
        color: "#fffdf9",
        fontSize: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 4px 16px rgba(240,168,96,0.35)",
        transition: "transform 0.2s, box-shadow 0.2s",
        touchAction: "manipulation",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1.08)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px rgba(240,168,96,0.45)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(240,168,96,0.35)";
      }}
      onTouchStart={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(0.95)";
      }}
      onTouchEnd={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
      }}
    >
      <PlusOutlined />
    </button>
  );
}
