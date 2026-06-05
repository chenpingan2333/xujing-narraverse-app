"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "antd";
import { UserAddOutlined, GlobalOutlined, PlayCircleOutlined } from "@ant-design/icons";
import BottomNav from "../components/navigation/BottomNav";

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(t);
  }, []);

  // Check auth state — redirect unauthenticated users to login
  useEffect(() => {
    fetch("/api/auth/session/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => setAuthed(!!data?.user))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) return null;
  if (!authed) {
    router.replace("/login");
    return null;
  }

  const handleStart = () => {
    const dc = localStorage.getItem("xujing_default_character");
    router.push(dc ? `/chat?characterId=${dc}` : "/characters");
  };

  const btnBase = {
    height: 48, paddingLeft: 32, paddingRight: 32,
    fontSize: 15, fontWeight: 400,
    fontFamily: "'Georgia', 'Noto Serif SC', serif",
    borderRadius: 24, letterSpacing: 3,
    transition: "all 0.4s ease",
  };

  return (
            <>
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(170deg, #fff8ed 0%, #fef0db 30%, #fde8d0 70%, #fce0c8 100%)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Floating light particles */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="xj-float" style={{
            position: "absolute",
            left: `${10 + i * 11}%`,
            top: `${20 + (i % 5) * 14}%`,
            width: 6 + (i % 3) * 4,
            height: 6 + (i % 3) * 4,
            borderRadius: "50%",
            background: i % 2 === 0
              ? "rgba(246,193,119,0.25)"
              : "rgba(242,181,212,0.18)",
            animationDelay: `${i * 0.6}s`,
            animationDuration: `${4 + (i % 3) * 2}s`,
          }} />
        ))}
      </div>

      {/* Main content */}
      <div style={{
        textAlign: "center", zIndex: 1,
        opacity: ready ? 1 : 0,
        transition: "opacity 1.2s ease",
      }}>
        <h1 style={{
          fontFamily: "'Georgia', 'Noto Serif SC', 'Songti SC', serif",
          fontSize: 64, fontWeight: 400, color: "#5C4033",
          margin: 0, letterSpacing: 6,
          opacity: ready ? 1 : 0, filter: ready ? "blur(0)" : "blur(4px)",
          transition: "opacity 0.8s ease, filter 0.8s ease",
        }}>
          叙境
        </h1>
        <p style={{
          fontFamily: "'Georgia', 'Noto Serif SC', serif",
          fontSize: 17, color: "#B08968", marginTop: 8,
          letterSpacing: 8, fontWeight: 400,
          opacity: ready ? 1 : 0,
          transition: "opacity 0.8s ease 0.15s",
        }}>
          一个有温度的存在
        </p>
        <p style={{
          fontSize: 14, color: "#c4a68a", marginTop: 16, marginBottom: 0,
          letterSpacing: 4, fontWeight: 300,
          opacity: ready ? 1 : 0,
          transition: "opacity 0.8s ease 0.3s",
        }}>
          一个有温度的叙事世界
        </p>
      </div>

      {/* Action buttons */}
      <div style={{
        marginTop: 48, zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
        opacity: ready ? 1 : 0,
        transform: ready ? "translateY(0)" : "translateY(16px)",
        transition: "all 0.7s ease 0.4s",
      }}>
        {/* 创建角色 */}
        <Button
          icon={<UserAddOutlined />}
          onClick={() => router.push("/characters/create")}
          style={{
            ...btnBase, width: 240,
            background: "linear-gradient(135deg, #f6c177 0%, #f0a860 100%)",
            border: "none", color: "#fffdf9",
            boxShadow: "0 4px 20px rgba(240,168,96,0.30)",
          }}
          className="xj-glow"
        >
          创建角色
        </Button>

        {/* 创建世界包 */}
        <Button
          icon={<GlobalOutlined />}
          onClick={() => router.push("/worlds/create")}
          style={{
            ...btnBase, width: 240,
            background: "transparent",
            border: "1.5px solid #ead9c0", color: "#B08968",
          }}
        >
          创建世界包
        </Button>

        {/* 开始叙境 */}
        <Button
          icon={<PlayCircleOutlined />}
          onClick={handleStart}
          style={{
            ...btnBase, width: 240, marginTop: 8,
            background: "#fdf8f0",
            border: "1.5px solid #ead9c0", color: "#8b7355",
          }}
        >
          开始叙境
        </Button>
      </div>

      {/* Subtitle */}
      <p style={{
        marginTop: 32, fontSize: 13, color: "#c4a68a",
        letterSpacing: 3, fontWeight: 300, zIndex: 1,
        opacity: ready ? 1 : 0,
        transition: "opacity 0.8s ease 0.6s",
      }}>
        选择角色 · 进入世界 · 书写你的故事
      </p>
    </div>
      <BottomNav />
    </>
  );
}