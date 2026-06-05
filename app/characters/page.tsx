"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout, Card, Typography, Button, Modal, Input, Select, Tag, Row, Col, message as antMsg } from "antd";
import { PlusOutlined, SettingOutlined, DownOutlined, UpOutlined } from "@ant-design/icons";
import AdInterstitial from "../ui/ad-interstitial";
import BackButton from "../../components/navigation/BackButton";
import BottomNav from "../../components/navigation/BottomNav";
import CreateFab from "../../components/ui/CreateFab";

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;
const { TextArea } = Input;

interface Character {
  id: string;
  name: string;
  displayName?: string;
  persona: string;
  description: string;
  displayDescription?: string;
  tier: string;
  worldId: string | null;
  avatar: string;
  relationship?: { affection: number; trust: number; intimacy: number };
}

const TIER_COLORS: Record<string, string> = { basic: "#B08968", premium: "#e8965e", story: "#d4786e" };
const TIER_LABELS: Record<string, string> = { basic: "相识", premium: "知已", story: "羁绊" };
const AVATAR_BG: Record<string, string> = { basic: "#fdf0e0", premium: "#fef0e5", story: "#fef0ea" };

function CharactersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newChar, setNewChar] = useState({ name: "", persona: "", description: "", tier: "basic", speechStyle: "", background: "", greeting: "", taboos: "" });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ══ P0-1: Ad interstitial state ══
  const [adOpen, setAdOpen] = useState(false);
  const [adReward, setAdReward] = useState(0);
  const [adWatched, setAdWatched] = useState(false);

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
    router.push("/chat?" + params.toString());
  };

  const doCreate = useCallback(async (withAd: boolean) => {
    setCreating(true);
    try {
      const res = await fetch("/api/characters", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newChar.name, persona: newChar.persona, description: newChar.description,
          tier: newChar.tier, speechStyle: newChar.speechStyle, background: newChar.background,
          greeting: newChar.greeting, taboos: newChar.taboos,
          _adWatched: withAd,
        }),
      });
      const data = await res.json();

      if (data._blocked) {
        setAdReward(data._adReward ?? 30);
        setAdOpen(true);
        return;
      }

      if (res.ok) {
        setCharacters((prev) => [...prev, data]);
        setCreateOpen(false);
        setNewChar({ name: "", persona: "", description: "", tier: "basic", speechStyle: "", background: "", greeting: "", taboos: "" });
        setShowAdvanced(false);
        setAdWatched(false);
        antMsg.success(withAd ? "观看星光故事后，角色已创建！" : "角色已创建");
      } else {
        antMsg.error("创建失败，请再试一次");
      }
    } catch { antMsg.error("网络连接失败"); }
    finally { setCreating(false); }
  }, [newChar]);

  const handleCreate = async () => {
    if (!newChar.name.trim()) { antMsg.warning("请为角色起一个名字"); return; }
    if (!newChar.persona.trim()) { antMsg.warning("请描述一下角色的性格"); return; }
    await doCreate(adWatched);
  };

  const handleAdComplete = () => {
    setAdOpen(false);
    setAdWatched(true);
    doCreate(true);
  };

  return (
    <>
      <Content style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 100px", minHeight: "100vh" }} className="page-scroll">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <BackButton />
          <Title level={3} style={{ margin: 0, color: "#5C4033", fontWeight: 400, fontFamily: "'Georgia','Noto Serif SC',serif", letterSpacing: 4 }}>
            你的角色
          </Title>
          <Button icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}
            style={{
              background: "linear-gradient(135deg, #f6c177, #f0a860)", border: "none",
              color: "#fffdf9", borderRadius: 20, fontWeight: 400, fontSize: 13,
              boxShadow: "0 2px 12px rgba(240,168,96,0.25)",
            }}>
            创建角色
          </Button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 64 }}>
            <Text style={{ color: "#B08968", fontSize: 15 }}>正在翻阅角色相册……</Text>
          </div>
        ) : characters.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.6 }}>✨</div>
            <Title level={4} style={{ color: "#B08968", fontWeight: 400, marginBottom: 8 }}>
              还没有角色
            </Title>
            <Text style={{ color: "#c4a68a", fontSize: 14, display: "block", marginBottom: 24 }}>
              创建你的第一个角色，开始一段故事
            </Text>
            <Button
              icon={<PlusOutlined />}
              onClick={() => setCreateOpen(true)}
              size="large"
              style={{
                background: "linear-gradient(135deg, #f6c177, #f0a860)", border: "none",
                color: "#fffdf9", borderRadius: 20, fontWeight: 400,
                boxShadow: "0 4px 16px rgba(240,168,96,0.30)",
              }}>
              创建第一个角色
            </Button>
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {characters.map((char, idx) => (
              <Col key={char.id} xs={24} sm={12}>
                <div
                  className="photo-card"
                  onClick={() => selectChar(char)}
                  style={{ animationDelay: idx * 0.08 + "s" }}
                >
                  <div style={{ padding: 20, display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 18, fontSize: 28,
                      background: AVATAR_BG[char.tier] ?? "#fdf0e0",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {char.avatar}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <Title level={4} style={{
                          margin: 0, color: "#5C4033", fontSize: 16, fontWeight: 400,
                          fontFamily: "'Georgia','Noto Serif SC',serif",
                        }}>
                          {char.displayName || char.name}
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
                        {(() => { const d = char.displayDescription || char.persona; return d.length > 48 ? d.slice(0, 48) + "…" : d; })()}
                      </Paragraph>
                      {char.relationship && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <Text style={{ fontSize: 11, color: "#B08968" }}>温度</Text>
                            <Text style={{ fontSize: 11, color: "#e8965e", fontWeight: 500 }}>
                              {Math.round((char.relationship.affection + char.relationship.trust + char.relationship.intimacy) / 3)}%
                            </Text>
                          </div>
                          <div style={{ height: 3, borderRadius: 2, background: "#f0e5d5", overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 2,
                              width: Math.round((char.relationship.affection + char.relationship.trust + char.relationship.intimacy) / 3) + "%",
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
          onCancel={() => { setCreateOpen(false); setNewChar({ name: "", persona: "", description: "", tier: "basic", speechStyle: "", background: "", greeting: "", taboos: "" }); setShowAdvanced(false); }}
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
              <Text style={{ color: "#B08968", fontSize: 12, display: "block", marginBottom: 6 }}>TA 是什么样的？</Text>
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
                  { value: "premium", label: "知已" },
                  { value: "story", label: "羁绊" },
                ]} />
            </div>

            <div style={{ marginTop: 8 }}>
              <Button type="link" onClick={() => setShowAdvanced(!showAdvanced)} style={{ padding: 0, color: "#B08968", fontSize: 13 }}>
                <SettingOutlined style={{ marginRight: 4 }} />高级设置 {showAdvanced ? <UpOutlined /> : <DownOutlined />}
              </Button>
            </div>
            {showAdvanced && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12, padding: 16, background: "#fdf8f0", borderRadius: 12, border: "1px solid #ead9c0" }}>
                <div>
                  <Text style={{ color: "#B08968", fontSize: 12, display: "block", marginBottom: 4 }}>说话风格 / 口癖</Text>
                  <Input placeholder="比如：喜欢用'呢'、'啦'结尾，说话带点撒娇……" value={newChar.speechStyle}
                    onChange={(e) => setNewChar({ ...newChar, speechStyle: e.target.value })} maxLength={100} />
                </div>
                <div>
                  <Text style={{ color: "#B08968", fontSize: 12, display: "block", marginBottom: 4 }}>背景故事</Text>
                  <TextArea placeholder="TA 有过怎样的经历？为什么成为现在这样？" rows={3}
                    value={newChar.background} onChange={(e) => setNewChar({ ...newChar, background: e.target.value })}
                    maxLength={300} showCount />
                </div>
                <div>
                  <Text style={{ color: "#B08968", fontSize: 12, display: "block", marginBottom: 4 }}>开场白</Text>
                  <TextArea placeholder="第一次见面时 TA 会说什么？" rows={2}
                    value={newChar.greeting} onChange={(e) => setNewChar({ ...newChar, greeting: e.target.value })}
                    maxLength={150} />
                </div>
                <div>
                  <Text style={{ color: "#B08968", fontSize: 12, display: "block", marginBottom: 4 }}>禁忌话题</Text>
                  <Input placeholder="哪些话题绝对不能提？用逗号分隔" value={newChar.taboos}
                    onChange={(e) => setNewChar({ ...newChar, taboos: e.target.value })} maxLength={100} />
                </div>
              </div>
            )}
          </div>
        </Modal>

        <AdInterstitial
          open={adOpen}
          adType="character_create"
          rewardStars={adReward}
          onComplete={handleAdComplete}
          onDismiss={() => { setAdOpen(false); setCreating(false); }}
        />

        {/* FAB — always visible to create character */}
        <CreateFab onClick={() => setCreateOpen(true)} />
      </Content>
      <BottomNav />
    </>
  );
}

export default function CharactersPage() {
  return (
    <Suspense fallback={<p style={{ textAlign: "center", color: "#B08968", padding: 48 }}>翻阅中……</p>}>
      <CharactersPageInner />
    </Suspense>
  );
}
