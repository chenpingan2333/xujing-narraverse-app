"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  HomeOutlined,
  UserOutlined,
  MessageOutlined,
  ShopOutlined,
  SmileOutlined,
} from "@ant-design/icons";

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "首页", icon: <HomeOutlined />, path: "/" },
  { key: "characters", label: "角色", icon: <UserOutlined />, path: "/characters" },
  { key: "chat", label: "聊天", icon: <MessageOutlined />, path: "/chat" },
  { key: "marketplace", label: "商店", icon: <ShopOutlined />, path: "/marketplace" },
  { key: "profile", label: "我的", icon: <SmileOutlined />, path: "/profile" },
];

/**
 * BottomNav — 叙境移动端底部导航栏
 *
 * 固定在页面底部，5 个主要入口
 * 当前活跃项高亮为品牌色
 * 适配 safe-area-inset-bottom
 */
export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (item: NavItem) => {
    if (item.path === "/") return pathname === "/";
    return pathname.startsWith(item.path);
  };

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        background: "rgba(255, 250, 245, 0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid #ead9c0",
        paddingBottom: "env(safe-area-inset-bottom, 8px)",
        paddingTop: 6,
        height: "auto",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item);
        return (
          <button
            key={item.key}
            onClick={() => router.push(item.path)}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              padding: "6px 12px",
              minWidth: 56,
              minHeight: 48,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: active ? "#b08968" : "#c4a68a",
              fontSize: 11,
              fontFamily: "'Georgia', 'Noto Serif SC', serif",
              letterSpacing: 1,
              fontWeight: active ? 400 : 300,
              transition: "color 0.2s, transform 0.2s",
              touchAction: "manipulation",
              transform: active ? "translateY(-2px)" : "none",
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>
              {item.icon}
            </span>
            <span>{item.label}</span>
            {active && (
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "#b08968",
                  marginTop: 1,
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
