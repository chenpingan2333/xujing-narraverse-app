"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout, Card, Typography, Button, Modal, Input, Select, Tag, Row, Col, message as antMsg } from "antd";
import { PlusOutlined, ArrowLeftOutlined } from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;
const { TextArea } = Input;

interface Character {
  id: string;
  name: string;
  persona: string;
  description: string;
  tier: string;
  worldId: string | null;
  avatar: string;
  relationship?: { affection: number; trust: number; intimacy: number };
}

const TIER_COLORS: Record<string, string> = { basic: "#B08968", premium: "#e8965e", story: "#d4786e" };
const TIER_LABELS: Record<string, string> = { basic: "相识", premium: "知己", story: "羁绊" };
const AVATAR_BG: Record<string, string> = { basic: "#fdf0e0", premium: "#fef0e5", story: "#fef0ea" };

function CharactersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newChar, setNewChar] = useState({ name: "", persona: "", description: "", tier: "basic" });

  useEffect(() => {
    fetch("/api/characters")
      .then((r) => r.json())
      .then(setCharacters)
      .finally(() => setLoading(false));
  }, []);

  const selectChar = (char: Character) => {
    localStorage.setItem("xujing_default_character", char.id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("characterId", char.id);
    params.set("characterName", char.name);
    router.push(`/chat?${params.toString()}`);
  };

  const handleCreate = async () => {
    if (!newChar.name.trim()) { antMsg.warning("请为角色起一个名字"); return; }
    if (!newChar.persona.trim()) { antMsg.warning("请描述一下角色的性格"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/characters", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newChar),
      });
      if (res.ok) {
        const created = await res.json();
        setCharacters((prev) => [...prev, created]);
        setCreateOpen(false);
        setNewChar({ name: "", persona: "", description: "", tier: "basic" });
        antMsg.success("角色已创建");
      } else {
        antMsg.error("创建失败，请再试一次");
      }
    } catch { antMsg.error("网络连接失败"); }
    finally { setCreating(false); }
  };

  return (
    <Content style={{ maxWidth: 900, margin: "0 auto", padding: 32, minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => router.push("/")}
          style={{ color: "#B08968" }}>返回</Button>
        <Title level={2} style={{ margin: 0, color: "#5C4033", fontWeight: 400, fontFamily: "'Georgia','Noto Serif SC',serif", letterSpacing: 4 }}>
          你的角色
        </Title>
        <Button icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}
          style={{
            background: "linear-gradient(135deg, #f6c177, #f0a860)", border: "none",
            color: "#fffdf9", borderRadius: 20, fontWeight: 400,
            boxShadow: "0 2px 12px rgba(240,168,96,0.25)",
          }}>
          创建一个角色
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 64 }}>
          <Text style={{ color: "#B08968", fontSize: 15 }}>正在翻阅角色相册……</Text>
        </div>
      ) : (
        <Row gutter={[20, 20]}>
          {characters.map((char, idx) => (
            <Col key={char.id} xs={24} sm={12}>
              <div
                className="photo-card"
                onClick={() => selectChar(char)}
                style={{ animationDelay: `${idx * 0.08}s` }}
              >
                <div style={{ padding: 24, display: "flex", gap: 18, alignItems: "flex-start" }}>
                  {/* Avatar */}
                  <div style={{
                    width: 64, height: 64, borderRadius: 20, fontSize: 32,
                    background: AVATAR_BG[char.tier] ?? "#fdf0e0",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {char.avatar}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <Title level={4} style={{
                        margin: 0, color: "#5C4033", fontSize: 18, fontWeight: 400,
                        fontFamily: "'Georgia','Noto Serif SC',serif",
                      }}>
                        {char.name}
                      </Title>
                      <Tag style={{
                        background: TIER_COLORS[char.tier] + "15",
                        color: TIER_COLORS[char.tier], border: "none",
                        fontSize: 11, borderRadius: 8, fontWeight: 500,
                      }}>
                        {TIER_LABELS[char.tier]}
                      </Tag>
                    </div>
                    <Paragraph style={{
                      color: "#8b7355", fontSize: 13, margin: 0,
                      lineHeight: 1.6, fontStyle: "italic",
                    }}>
                      {char.persona.length > 54 ? char.persona.slice(0, 54) + "…" : char.persona}
                    </Paragraph>
                    {/* Warmth bar */}
                    {char.relationship && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <Text style={{ fontSize: 11, color: "#B08968" }}>温度</Text>
                          <Text style={{ fontSize: 11, color: "#e8965e", fontWeight: 500 }}>
                            {Math.round((char.relationship.affection + char.relationship.trust + char.relationship.intimacy) / 3)}%
                          </Text>
                        </div>
                        <div style={{
                          height: 4, borderRadius: 2, background: "#f0e5d5",
                          overflow: "hidden",
                        }}>
                          <div style={{
                            height: "100%", borderRadius: 2,
                            width: `${Math.round((char.relationship.affection + char.relationship.trust + char.relationship.intimacy) / 3)}%`,
                            background: "linear-gradient(90deg, #f6c177, #f0a860, #e8965e)",
                            transition: "width 0.6s ease",
                          }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title={<span style={{ color: "#5C4033", fontFamily: "'Georgia','Noto Serif SC',serif" }}>写一段人物故事</span>}
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => { setCreateOpen(false); setNewChar({ name: "", persona: "", description: "", tier: "basic" }); }}
        okText="创建角色"
        cancelText="再想想"
        confirmLoading={creating}
        okButtonProps={{
          style: { background: "linear-gradient(135deg, #f6c177, #f0a860)", border: "none", borderRadius: 16, color: "#fffdf9" },
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <Text style={{ color: "#B08968", fontSize: 12, display: "block", marginBottom: 6 }}>名字</Text>
            <Input placeholder="给你的角色起个名字……" value={newChar.name}
              onChange={(e) => setNewChar({ ...newChar, name: e.target.value })} maxLength={20} />
          </div>
          <div>
            <Text style={{ color: "#B08968", fontSize: 12, display: "block", marginBottom: 6 }}>她 / 他是什么样的？</Text>
            <TextArea placeholder="比如：温柔体贴的邻家女孩，喜欢在午后阳光下读诗……" rows={4}
              value={newChar.persona} onChange={(e) => setNewChar({ ...newChar, persona: e.target.value })}
              maxLength={200} showCount />
          </div>
          <div>
            <Text style={{ color: "#B08968", fontSize: 12, display: "block", marginBottom: 6 }}>一句话介绍</Text>
            <TextArea placeholder="用一句话介绍这个角色" rows={2}
              value={newChar.description} onChange={(e) => setNewChar({ ...newChar, description: e.target.value })}
              maxLength={100} />
          </div>
          <div>
            <Text style={{ color: "#B08968", fontSize: 12, display: "block", marginBottom: 6 }}>关系阶段</Text>
            <Select value={newChar.tier} onChange={(v) => setNewChar({ ...newChar, tier: v })}
              style={{ width: "100%" }}
              options={[
                { value: "basic", label: "相识" },
                { value: "premium", label: "知己" },
                { value: "story", label: "羁绊" },
              ]} />
          </div>
        </div>
      </Modal>
    </Content>
  );
}

export default function CharactersPage() {
  return (
    <Suspense fallback={<p style={{ textAlign: "center", color: "#B08968", padding: 48 }}>翻阅中……</p>}>
      <CharactersPageInner />
    </Suspense>
  );
}