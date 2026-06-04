"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftOutlined } from "@ant-design/icons";

interface BackButtonProps {
  /** Override default back behavior */
  onClick?: () => void;
  /** Show label text next to arrow */
  label?: string;
  /** Inline style overrides */
  style?: React.CSSProperties;
}

/**
 * BackButton — 全站统一返回按钮
 *
 * 移动端：左边缘触摸区域加大 (44px min-height)
 * 桌面端：紧凑文字按钮
 * 默认行为：router.back()
 */
export default function BackButton({ onClick, label, style }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Try back first, fallback to home
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push("/");
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label={label ?? "返回"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "transparent",
        border: "none",
        color: "#B08968",
        fontSize: 14,
        fontFamily: "'Georgia', 'Noto Serif SC', serif",
        cursor: "pointer",
        padding: "8px 12px",
        borderRadius: 12,
        minHeight: 44,
        minWidth: 44,
        touchAction: "manipulation",
        transition: "background 0.2s",
        ...style,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "rgba(176,137,104,0.08)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <ArrowLeftOutlined style={{ fontSize: 16 }} />
      {label && <span style={{ letterSpacing: 2 }}>{label}</span>}
    </button>
  );
}
