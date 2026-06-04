﻿"use client";

import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Layout, Input, Button, Card, Typography, Tag, Drawer, List, Avatar, Badge } from "antd";
import {
  SendOutlined, UserOutlined, RobotOutlined, MenuOutlined,
  HeartOutlined, LeftOutlined, BookOutlined, WalletOutlined, EditOutlined,
} from "@ant-design/icons";
import { buildRelationshipUIModel, getWarmthGradient, getTrendEmoji } from "../relationship/ui-model";
import { usePurchaseReaction } from "../ui/purchase-reaction";
import DiamondAnimation from "../ui/diamond-animation";

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;
const { Content, Header } = Layout;

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  displayedContent: string;
  timestamp: number;
  isStreaming?: boolean;
}

interface ChatMetadata {
  sessionId: string; modelId: string; provider: string; tier: string;
  latencyMs: number; inputTokens: number; outputTokens: number;
  memoryCount: number; starCost: number;
}

interface RelationshipDelta { affection: number; trust: number; intimacy: number; reason: string; }
interface MemoryEvent { type: string; content: string; importance?: number; }
interface CharacterInfo { id: string; name: string; persona: string; avatar: string; tier: string; }

const WORLD_META: Record<string, { emoji: string; label: string }> = {
  fantasy: { emoji: "\u{1F3F0}", label: "\u827e\u5c14\u5fb7\u5170" },
  scifi:   { emoji: "\u{1F680}", label: "\u661f\u8fb0\u7eaa\u5143" },
  wuxia:   { emoji: "\u2694\uFE0F", label: "\u6c5f\u6e56\u98ce\u4e91" },
};

let msgIdCounter = 0;
function nextMsgId() { return `msg-\${Date.now()}-\${++msgIdCounter}`; }

function ChatPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const characterId = searchParams.get("characterId") ?? "char-001";
  const characterName = searchParams.get("characterName") ?? "\u827e\u7433";
  const worldId = searchParams.get("worldId");
  const worldName = searchParams.get("worldName");
  const worldType = searchParams.get("worldType");
  const worldMode = searchParams.get("worldMode");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `sess-\${Date.now()}-\${Math.random().toString(36).slice(2, 8)}`);
  const [metadata, setMetadata] = useState<ChatMetadata | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [memories, setMemories] = useState<MemoryEvent[]>([]);
  const [starBalance, setStarBalance] = useState(500);
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const [diamondAnim, setDiamondAnim] = useState(false);
  const [onboardingState, setOnboardingState] = useState<{ currentStep: string; isFirstTime: boolean; firstMessageSent: boolean; rewardClaimed: boolean } | null>(null);

  // Relationship state with trend detection
  const [relAffection, setRelAffection] = useState(50);
  const [relTrust, setRelTrust] = useState(50);
  const [relIntimacy, setRelIntimacy] = useState(50);
  const [relReason, setRelReason] = useState<string | undefined>();
  const [prevTemp, setPrevTemp] = useState<number | undefined>();

  const bottomRef = useRef<HTMLDivElement>(null);
  const streamFrames = useRef<Map<string, number>>(new Map());

  // Emotion feedback for diamond consumption
  const { reaction, triggerReaction, dismissReaction } = usePurchaseReaction();

  const [characters, setCharacters] = useState<CharacterInfo[]>([]);
  const currentChar = characters.find((c) => c.id === characterId);

  useEffect(() => {
    fetch("/api/characters").then((r) => r.json()).then(setCharacters).catch(() => {});
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  // Fetch current user from session
  useEffect(() => {
    fetch("/api/auth/session/me").then((r) => r.json()).then((data) => {
      if (data.user?.id) setUserId(data.user.id);
    }).catch(() => {});
  }, []);
  useEffect(() => () => { streamFrames.current.forEach((id) => cancelAnimationFrame(id)); }, []);
  useEffect(() => {
    if (!userId) return;
    fetch("/api/onboarding").then((r) => r.json()).then((data) => {
      if (data.onboarding) setOnboardingState(data.onboarding);
    }).catch(() => {});
  }, [userId]);

  const relModel = useMemo(() => buildRelationshipUIModel(relAffection, relTrust, relIntimacy, prevTemp), [relAffection, relTrust, relIntimacy, prevTemp]);

  const typewriterEffect = useCallback((fullText: string, msgId: string) => {
    // Cancel any existing animation frame for this message
    if (streamFrames.current.has(msgId)) {
      cancelAnimationFrame(streamFrames.current.get(msgId)!);
    }
    const charsPerTick = 1.2;        // average characters revealed per rAF tick
    const msPerChar = 20 + Math.random() * 18; // ms per character
    const startTime = performance.now();
    let lastCharIdx = -1;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const i = Math.min(Math.floor(elapsed / msPerChar * charsPerTick), fullText.length);
      if (i !== lastCharIdx) {
        lastCharIdx = i;
        setMessages((prev) => prev.map((m) =>
          m.id === msgId ? { ...m, displayedContent: fullText.slice(0, i), isStreaming: i < fullText.length } : m
        ));
      }
      if (i < fullText.length) {
        streamFrames.current.set(msgId, requestAnimationFrame(tick));
      } else {
        streamFrames.current.delete(msgId);
      }
    };

    streamFrames.current.set(msgId, requestAnimationFrame(tick));
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const uid = nextMsgId();
    setMessages((prev) => [...prev, { id: uid, role: "user", content: text, displayedContent: text, timestamp: Date.now() }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId || "anon", characterId, message: text, sessionId, isVip: true, worldId, worldTier: "basic", worldType }),
      });
      const data = await res.json();

      if (data.error) {
        const eid = nextMsgId();
        setMessages((prev) => [...prev, { id: eid, role: "assistant", content: data.error, displayedContent: data.error, timestamp: Date.now() }]);
        return;
      }

      const replyText: string = data.reply ?? "";
      if (replyText.length === 0) {
        const eid = nextMsgId();
        setMessages((prev) => [...prev, { id: eid, role: "assistant", content: "\u2026\u2026", displayedContent: "\u2026\u2026", timestamp: Date.now() }]);
        return;
      }

      const aid = nextMsgId();
      setMessages((prev) => [...prev, { id: aid, role: "assistant", content: replyText, displayedContent: "", timestamp: Date.now(), isStreaming: true }]);
      // Gentle pause before the character's words unfold
      const typeDelay = 150 + Math.random() * 450;
      setTimeout(() => typewriterEffect(replyText, aid), typeDelay);

      setMetadata(data.metadata);
      if (data.metadata?.isFirstMessage && data.metadata?.onboardingComplete) {
        setOnboardingState((prev) => prev ? { ...prev, firstMessageSent: true, rewardClaimed: true } : null);
      }
      if (data.memoryEvents?.length) setMemories((prev) => [...data.memoryEvents, ...prev]);

      if (data.relationshipDelta) {
        const prev = Math.round((relAffection + relTrust + relIntimacy) / 3);
        setPrevTemp(prev);
        setRelAffection((p) => Math.min(100, Math.max(0, p + data.relationshipDelta.affection)));
        setRelTrust((p) => Math.min(100, Math.max(0, p + data.relationshipDelta.trust)));
        setRelIntimacy((p) => Math.min(100, Math.max(0, p + data.relationshipDelta.intimacy)));
        setRelReason(data.relationshipDelta.reason);
      }

      if (data.metadata?.starCost) {
        setStarBalance((prev) => Math.max(0, prev - data.metadata.starCost));
        setDiamondAnim(true);
        triggerReaction("chat_message", data.metadata.starCost, characterName);
      }
    } catch {
      const eid = nextMsgId();
      setMessages((prev) => [...prev, { id: eid, role: "assistant", content: "\u62b1\u6b49\uff0c\u8fde\u63a5\u4f3c\u4e4e\u51fa\u4e86\u95ee\u9898\u2026\u2026\u8bf7\u518d\u8bd5\u4e00\u6b21\u3002", displayedContent: "\u62b1\u6b49\uff0c\u8fde\u63a5\u4f3c\u4e4e\u51fa\u4e86\u95ee\u9898\u2026\u2026\u8bf7\u518d\u8bd5\u4e00\u6b21\u3002", timestamp: Date.now() }]);
    } finally { setLoading(false); }
  }, [input, loading, characterId, sessionId, worldId, worldType, characterName]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }, [sendMessage]);

  const switchCharacter = (char: CharacterInfo) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("characterId", char.id); p.set("characterName", char.name);
    router.push(`/chat?\${p.toString()}`);
  };

  const goToWorlds = () => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("worldId"); p.delete("worldName"); p.delete("worldType"); p.delete("worldMode");
    router.push(`/worlds?\${p.toString()}`);
  };

  const characterList = (
    <List dataSource={characters} renderItem={(char) => (
      <List.Item onClick={() => switchCharacter(char)}
        className={`chat-char-item \${char.id === characterId ? "active" : ""}`}
        style={{ padding: "12px 18px" }}>
        <List.Item.Meta
          avatar={<Avatar size={36} style={{ background: "#fdf0e0", color: "#B08968", fontSize: 16 }}>{char.avatar ?? char.name[0]}</Avatar>}
          title={<Text style={{ color: "#5C4033", fontSize: 14, fontWeight: char.id === characterId ? 600 : 400 }}>{char.name}</Text>}
          description={<Text style={{ color: "#B08968", fontSize: 11 }}>{char.persona?.slice(0, 18)}</Text>}
        />
      </List.Item>
    )} />
  );

  const Journal = (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20, height: "100%", overflow: "auto" }}>
      {/* Character card */}
      <div style={{ background: "#fdf8f0", borderRadius: 18, padding: 18, border: "1px solid #ead9c0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 14, background: "#fdf0e0",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            {currentChar?.avatar ?? "\uD83C\uDF38"}
          </div>
          <div>
            <Text strong style={{ color: "#5C4033", fontSize: 15, display: "block" }}>{characterName}</Text>
            <Text style={{ color: "#B08968", fontSize: 11, fontStyle: "italic" }}>
              {currentChar?.persona ?? "\u4e00\u4e2a\u6709\u6696\u610f\u7684\u5b58\u5728"}
            </Text>
          </div>
        </div>
      </div>

      {/* World context */}
      {worldName && (
        <div style={{ background: "#fdf8f0", borderRadius: 18, padding: 16, border: "1px solid #ead9c0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>{WORLD_META[worldType ?? ""]?.emoji ?? "\uD83C\uDF0D"}</span>
            <div>
              <Text strong style={{ color: "#5C4033", fontSize: 13, display: "block" }}>{worldName}</Text>
              <Text style={{ color: "#B08968", fontSize: 11 }}>
                {WORLD_META[worldType ?? ""]?.label ?? ""}{" \u00b7 "}{worldMode === "advanced" ? "\u6df1\u5ea6\u53d9\u4e8b" : "\u8f7b\u677e\u6f2b\u6e38"}
              </Text>
            </div>
          </div>
        </div>
      )}

      {/* Living Relationship Card */}
      <div style={{
        background: "#fdf8f0", borderRadius: 18, padding: 20,
        border: "1px solid #ead9c0", transition: "all 0.6s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <Text style={{ color: "#B08968", fontSize: 12 }}>
            <HeartOutlined style={{ marginRight: 6 }} />\u5173\u7cfb\u72b6\u6001
          </Text>
          <Text style={{ color: relModel.trend === "warming" ? "#e8965e" : relModel.trend === "cooling" ? "#8b7355" : "#B08968", fontSize: 12 }}>
            {getTrendEmoji(relModel.trend)} {relModel.trend === "warming" ? "\u5347\u6e29\u4e2d" : relModel.trend === "cooling" ? "\u964d\u6e29\u4e2d" : "\u7a33\u5b9a"}
          </Text>
        </div>

        {/* Temperature */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 42, fontWeight: 300, color: "#e8965e", fontFamily: "'Georgia', serif", lineHeight: 1 }}>
            {relModel.overallTemp}\u00b0
          </div>
          <Text style={{ color: "#B08968", fontSize: 13, display: "block", marginTop: 4 }}>{relModel.phaseLabel}</Text>
        </div>

        {/* Warmth */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ fontSize: 11, color: "#B08968" }}>\u6696\u610f</Text>
            <Text style={{ fontSize: 11, color: "#e8965e" }}>{relModel.warmth}</Text>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "#f0e5d5", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 3, width: `${relModel.warmth}%`,
              background: getWarmthGradient(relModel.warmth), transition: "width 1s ease" }} />
          </div>
        </div>

        {/* Stability */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ fontSize: 11, color: "#B08968" }}>\u4fe1\u4efb</Text>
            <Text style={{ fontSize: 11, color: "#d4945c" }}>{relModel.stability}</Text>
          </div>
          <div style={{ height: 3, borderRadius: 2, background: "#f0e5d5", position: "relative", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 2, width: `${relModel.stability}%`,
              background: "linear-gradient(90deg, #d4b896, #d4945c)", transition: "width 1s ease" }} />
            <div style={{ position: "absolute", top: -2, left: `${relModel.stability}%`,
              width: 7, height: 7, borderRadius: "50%", background: "#d4945c",
              transform: "translateX(-50%)", animation: "warmGlowPulse 2s ease-in-out infinite",
              transition: "left 1s ease" }} />
          </div>
        </div>

        {/* Proximity */}
        <div style={{ marginBottom: relReason ? 14 : 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ fontSize: 11, color: "#B08968" }}>\u4eb2\u8fd1</Text>
            <Text style={{ fontSize: 11, color: "#f0a860" }}>{relModel.proximity}</Text>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 4, padding: "4px 0" }}>
            {[0, 1, 2, 3, 4].map((i) => {
              const threshold = (i + 1) * 20;
              const filled = relModel.proximity >= threshold;
              return (
                <div key={i} style={{ width: 12, height: 12, borderRadius: "50%",
                  background: filled ? getWarmthGradient(threshold) : "#f0e5d5",
                  transition: "all 0.6s ease",
                  transform: filled ? `scale(\${1 + relModel.proximity / 200})` : "scale(1)" }} />
              );
            })}
          </div>
        </div>

        {relReason && (
          <div style={{ background: "#fef5e7", borderRadius: 10, padding: "8px 12px", border: "1px solid #f0dcc0", marginTop: 4 }}>
            <Text style={{ color: "#8b7355", fontSize: 11, fontStyle: "italic" }}>{relReason}</Text>
          </div>
        )}
      </div>

      {/* Memories */}
      <div style={{ background: "#fdf8f0", borderRadius: 18, padding: 18, border: "1px solid #ead9c0" }}>
        <Text style={{ color: "#B08968", fontSize: 12, display: "block", marginBottom: 10 }}>
          <BookOutlined style={{ marginRight: 6 }} />\u8bb0\u5fc6\u7247\u6bb5
        </Text>
        {memories.length === 0 ? (
          <Text style={{ color: "#c4a68a", fontSize: 12, fontStyle: "italic" }}>
            \u804a\u5f97\u591a\u4e86\uff0c\u8fd9\u91cc\u4f1a\u6162\u6162\u586b\u6ee1\u4f60\u4eec\u7684\u56de\u5fc6\u2026\u2026
          </Text>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {memories.slice(0, 6).map((m, i) => (
              <div key={i} className="memory-card" style={{ animationDelay: `\${i * 0.05}s` }}>
                <Text style={{ color: "#6b5540", fontSize: 12, lineHeight: 1.5 }}>{m.content}</Text>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Star diamonds with animation */}
      <div style={{ background: "#fdf8f0", borderRadius: 18, padding: 16, border: "1px solid #ead9c0", textAlign: "center" }}>
        <Text style={{ color: "#B08968", fontSize: 12, display: "block", marginBottom: 6 }}>
          <WalletOutlined style={{ marginRight: 4 }} />\u661f\u94bb
        </Text>
        <Text style={{ color: "#c4a68a", fontSize: 10, display: "block", marginBottom: 4 }}>\u5173\u7cfb\u5f71\u54cd</Text>
        <DiamondAnimation type={reaction.visible ? reaction.animationType : "warm-pulse"} active={diamondAnim} onComplete={() => setDiamondAnim(false)}>
          <span style={{ fontSize: 28, color: "#e8965e", fontWeight: 500, fontFamily: "'Georgia',serif" }}>
            {starBalance}
          </span>
        </DiamondAnimation>
        <Text style={{ color: "#B08968", fontSize: 11, display: "block" }}>\u4efd\u5fc3\u610f</Text>
        {reaction.visible && (
          <div style={{ marginTop: 8, background: "#fef5e7", borderRadius: 10, padding: "8px 12px", border: "1px solid #f0dcc0" }}>
            <Text style={{ color: "#8b7355", fontSize: 11, display: "block", lineHeight: 1.5, whiteSpace: "pre-line" }}>
              {reaction.message}
            </Text>
            {reaction.characterReaction && (
              <Text style={{ color: reaction.accentColor, fontSize: 11, fontStyle: "italic", display: "block", marginTop: 4 }}>
                \u2014 {characterName}\uff1a{reaction.characterReaction}
              </Text>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Layout style={{ height: "100vh", display: "flex", flexDirection: "row", overflow: "hidden", background: "#fffaf5" }}>
      {/* Left sidebar */}
      <div className="chat-left-sidebar" style={{ width: 210, flexShrink: 0, background: "#fdf8f0", borderRight: "1px solid #ead9c0", overflow: "auto" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #ead9c0" }}>
          <Button type="text" icon={<LeftOutlined />} onClick={() => router.push("/")}
            style={{ color: "#B08968", fontFamily: "'Georgia','Noto Serif SC',serif", fontWeight: 400 }}>\u53d9\u5883</Button>
        </div>
        {characterList}
      </div>

      {/* Center - Chat */}
      <Layout style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "#fffaf5" }}>
        <Header style={{ height: 54, lineHeight: "54px", padding: "0 18px", background: "#fdf8f0", borderBottom: "1px solid #ead9c0", display: "flex", alignItems: "center", gap: 12 }}>
          <Button type="text" icon={<MenuOutlined />} onClick={() => setMobileDrawer(true)} style={{ color: "#B08968" }} className="chat-mobile-menu" />
          <Button type="text" icon={<LeftOutlined />} onClick={() => router.push("/characters")} style={{ color: "#B08968" }} className="chat-mobile-back" />
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <Title level={5} style={{ margin: 0, color: "#5C4033", fontSize: 16, fontWeight: 400, fontFamily: "'Georgia','Noto Serif SC',serif", whiteSpace: "nowrap" }}>{characterName}</Title>
            {worldName ? (
              <Tag className="world-selector-tag" onClick={goToWorlds} style={{ fontSize: 11, flexShrink: 0 }}>
                {WORLD_META[worldType ?? ""]?.emoji ?? "\uD83C\uDF0D"} {worldName}
              </Tag>
            ) : (
              <Tag className="world-selector-tag" onClick={goToWorlds} style={{ fontSize: 11, flexShrink: 0 }}>
                <EditOutlined style={{ marginRight: 3 }} />\u9009\u62e9\u4e16\u754c
              </Tag>
            )}
          </div>
          <Badge count={starBalance} showZero color="#f0a860" overflowCount={999} style={{ fontSize: 10 }}>
            <WalletOutlined style={{ color: "#B08968", fontSize: 17 }} />
          </Badge>
        </Header>

        <Content style={{ flex: 1, overflow: "auto", padding: "20px 24px", background: "#fffdf9" }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            {messages.length === 0 && onboardingState?.isFirstTime && !onboardingState?.firstMessageSent && (
              <div className="xj-blur-in" style={{ textAlign: "center", marginTop: 30, marginBottom: 28, background: "linear-gradient(135deg, #fef5e7, #fdf0e0)", borderRadius: 20, padding: "28px 24px", border: "1px solid #f0dcc0" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✨</div>
                <Title level={4} style={{ color: "#5C4033", fontWeight: 400, fontFamily: "'Georgia','Noto Serif SC',serif", marginBottom: 8 }}>欢迎来到叙境</Title>
                <Paragraph style={{ color: "#B08968", fontSize: 14, lineHeight: 1.8, marginBottom: 0 }}>
                  这里是一个有温度的空间。她正在等你。<br />
                  发送你的第一句话，故事就从这里开始。
                </Paragraph>
              </div>
            )}
            {messages.length === 0 && (!onboardingState?.isFirstTime || onboardingState?.firstMessageSent) && (
              <div className="xj-blur-in" style={{ textAlign: "center", marginTop: 72 }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>{currentChar?.avatar ?? "\uD83C\uDF38"}</div>
                <Title level={4} style={{ color: "#5C4033", fontWeight: 400, fontFamily: "'Georgia','Noto Serif SC',serif" }}>
                  \u4f60\u597d\uff0c\u6211\u662f {characterName}
                </Title>
                <Paragraph style={{ color: "#B08968", fontSize: 14, fontStyle: "italic" }}>
                  {currentChar?.persona ?? "\u5f88\u9ad8\u5174\u9047\u89c1\u4f60\u3002"}
                </Paragraph>
                {worldName && (
                  <Tag style={{ marginTop: 8, background: "#fdf0e0", border: "none", color: "#B08968", borderRadius: 8 }}>
                    {WORLD_META[worldType ?? ""]?.emoji ?? "\uD83C\uDF0D"} \u5f53\u524d\u4e16\u754c\uff1a{worldName}
                  </Tag>
                )}
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className="xj-soft-in" style={{ display: "flex", gap: 10, marginBottom: 14, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {msg.role === "assistant" && <Avatar icon={<RobotOutlined />} size={32} style={{ background: "#fdf0e0", color: "#B08968", flexShrink: 0 }} />}
                <div className={msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai chat-bubble-breathe"}
                  style={{ maxWidth: "75%", padding: "12px 16px", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 14, lineHeight: 1.7 }}>
                  {msg.role === "assistant" ? (msg.displayedContent || "...") : msg.content}
                  {msg.isStreaming && <span className="xj-blink" style={{ color: "#B08968" }}>|</span>}
                </div>
                {msg.role === "user" && <Avatar icon={<UserOutlined />} size={32} style={{ background: "#fef0e5", color: "#d4945c", flexShrink: 0 }} />}
              </div>
            ))}

            {loading && !messages.some((m) => m.isStreaming) && (
              <div className="xj-soft-in" style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <Avatar icon={<RobotOutlined />} size={32} style={{ background: "#fdf0e0", color: "#B08968" }} />
                <div style={{ padding: "12px 16px", borderRadius: 18, background: "#fef5e7", border: "1px solid #f0dcc0" }}>
                  <span style={{ color: "#B08968", fontSize: 14 }}>\u6b63\u5728\u601d\u8003</span>
                  <span className="xj-blink" style={{ color: "#B08968" }}>...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </Content>

        <div style={{ background: "#fdf8f0", borderTop: "1px solid #ead9c0", padding: "12px 24px" }}>
          <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-end" }}>
            <TextArea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="\u60f3\u8bf4\u70b9\u4ec0\u4e48\u2026\u2026"
              autoSize={{ minRows: 1, maxRows: 4 }} style={{ flex: 1 }} disabled={loading} />
            <Button type="primary" icon={<SendOutlined />} onClick={sendMessage} loading={loading} disabled={!input.trim()}
              style={{ background: input.trim() ? "linear-gradient(135deg, #f6c177, #f0a860)" : "#e8d5c0", border: "none", borderRadius: 14, height: 40, width: 44, display: "flex", alignItems: "center", justifyContent: "center", color: "#fffdf9", transition: "all 0.3s", opacity: input.trim() ? 1 : 0.6 }} />
          </div>
        </div>
      </Layout>

      {/* Right - Journal */}
      <div className="chat-right-sidebar" style={{ width: 270, flexShrink: 0, background: "#fdf8f0", borderLeft: "1px solid #ead9c0", overflow: "hidden" }}>
        {Journal}
      </div>

      <Drawer title="\u89d2\u8272" placement="left" open={mobileDrawer} onClose={() => setMobileDrawer(false)} width={260}
        styles={{ body: { padding: 0, background: "#fffaf5" }, header: { background: "#fdf0e0", borderBottom: "1px solid #ead9c0" } }}>
        {characterList}
      </Drawer>
    </Layout>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<p style={{ textAlign: "center", color: "#B08968", padding: 48 }}>\u5979\u5728\u8fd9\u91cc\uff0c\u4e00\u76f4\u5728\u7b49\u4f60\u3002</p>}>
      <ChatPageInner />
    </Suspense>
  );
}
