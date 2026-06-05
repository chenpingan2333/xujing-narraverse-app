"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import BackButton from "../../../components/navigation/BackButton";
import BottomNav from "../../../components/navigation/BottomNav";
import { Layout, Typography, Button, Tabs, Input, Select, Tag, Upload, message as antMsg, Collapse, Card, Descriptions } from "antd";
import { PlusOutlined, InboxOutlined, FileAddOutlined, UploadOutlined } from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;
const { TextArea } = Input;
const { Dragger } = Upload;

const RARITY_OPTIONS = [
  { value: "normal", label: "普通角色 (免费)" },
  { value: "rare", label: "稀有角色 (490星钻)" },
  { value: "epic", label: "史诗角色 (990星钻)" },
];

export default function CharacterCreatePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("manual");
  const [loading, setLoading] = useState(false);

  // Manual form state
  const [form, setForm] = useState({
    name: "", display_name: "", description: "", personality: "",
    scenario: "", opening_message: "", speech_style: "",
    world_view: "", relationship_guide: "", story_nodes: "[]",
    extensions: "{}", tags: "", rarity: "normal", avatar: "",
  });

  // Import state
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  const updateForm = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  // ── Manual create ──
  const handleCreate = async () => {
    if (!form.name.trim()) { antMsg.warning("请输入角色名称"); return; }
    setLoading(true);
    try {
      const body = {
        name: form.name,
        display_name: form.display_name || form.name,
        persona: form.personality,
        description: form.description,
        speechStyle: form.speech_style,
        background: form.description,
        greeting: form.opening_message,
        openingMessage: form.opening_message,
        worldView: form.world_view,
        scenario: form.scenario,
        relationshipGuide: form.relationship_guide,
        storyNodes: JSON.parse(form.story_nodes || "[]"),
        extensions: JSON.parse(form.extensions || "{}"),
        tags: form.tags ? form.tags.split(",").map(t => t.trim()) : [],
        rarity: form.rarity,
        price_star: form.rarity === "rare" ? 490 : form.rarity === "epic" ? 990 : 0,
        avatar: form.avatar || "✨",
        tier: "premium",
      };
      const res = await fetch("/api/characters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) {
        antMsg.success("角色创建成功！");
        console.log("[CHARACTER_CREATED] name=" + body.name + " id=" + data.id + " price=" + body.price_star);
        router.push("/characters");
      } else {
        antMsg.error(data.error || "创建失败");
      }
    } catch { antMsg.error("网络错误"); }
    finally { setLoading(false); }
  };

  // ── Import ──
  const handleImportFile = useCallback(async (file: File) => {
    setImportError(null);
    setImportFile(file);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch("/api/characters/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ json }) });
      const data = await res.json();
      if (res.ok && data.preview) {
        setImportPreview(data.preview);
      } else {
        setImportError(data.error || "解析失败");
      }
    } catch {
      setImportError("无法解析文件，请确认是有效的 JSON 角色卡" as any);
    }
    return false;
  }, []);

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setLoading(true);
    try {
      const res = await fetch("/api/characters/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ json: importPreview, confirm: true }) });
      const data = await res.json();
      if (res.ok) {
        antMsg.success("角色导入成功！");
        console.log("[CHARACTER_IMPORTED] source=json name=" + importPreview.name);
        router.push("/characters");
      } else {
        antMsg.error(data.error || "导入失败");
      }
    } catch { antMsg.error("网络错误"); }
    finally { setLoading(false); }
  };

  const uploadProps = { name: "file", multiple: false, accept: ".json,.png", showUploadList: false, beforeUpload: handleImportFile };

  return (<>
    <Content className="page-scroll" style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px 100px", minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24, gap: 12 }}>
        <BackButton />
        <Title level={4} style={{ margin: 0, color: "#5C4033", fontFamily: "'Georgia','Noto Serif SC',serif", letterSpacing: 3 }}>创建角色</Title>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        { key: "manual", label: "新建角色", children: (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* 基础信息 */}
            <Card size="small" title="基础信息" style={{ borderRadius: 12, background: "#fdf8f0", border: "1px solid #ead9c0" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div><Text style={{ color: "#B08968", fontSize: 12 }}>角色内部名 *</Text>
                  <Input placeholder="给模型用的名字（如 Hikari Tachibana）" value={form.name} onChange={e => updateForm("name", e.target.value)} /></div>
                <div><Text style={{ color: "#B08968", fontSize: 12 }}>前端展示名</Text>
                  <Input placeholder="用户看到的名字（如 橘光）" value={form.display_name} onChange={e => updateForm("display_name", e.target.value)} /></div>
                <div><Text style={{ color: "#B08968", fontSize: 12 }}>标签（逗号分隔）</Text>
                  <Input placeholder="如：校园, 青梅竹马, 甜宠" value={form.tags} onChange={e => updateForm("tags", e.target.value)} /></div>
                <div><Text style={{ color: "#B08968", fontSize: 12 }}>品质</Text>
                  <Select value={form.rarity} onChange={v => updateForm("rarity", v)} options={RARITY_OPTIONS} style={{ width: "100%" }} /></div>
              </div>
            </Card>

            {/* 核心描述 */}
            <Card size="small" title="核心描述（给模型用）" style={{ borderRadius: 12, background: "#fdf8f0", border: "1px solid #ead9c0" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div><Text style={{ color: "#B08968", fontSize: 12 }}>角色完整设定 (description)</Text>
                  <TextArea rows={4} placeholder="给 LLM 的角色描述" value={form.description} onChange={e => updateForm("description", e.target.value)} /></div>
                <div><Text style={{ color: "#B08968", fontSize: 12 }}>性格 (personality)</Text>
                  <TextArea rows={3} placeholder="角色的性格特征" value={form.personality} onChange={e => updateForm("personality", e.target.value)} /></div>
                <div><Text style={{ color: "#B08968", fontSize: 12 }}>世界背景 / 场景 (scenario)</Text>
                  <TextArea rows={3} placeholder="当前故事发生的世界背景" value={form.scenario} onChange={e => updateForm("scenario", e.target.value)} /></div>
              </div>
            </Card>

            {/* 交互设定 */}
            <Card size="small" title="交互设定" style={{ borderRadius: 12, background: "#fdf8f0", border: "1px solid #ead9c0" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div><Text style={{ color: "#B08968", fontSize: 12 }}>开场白 (opening_message)</Text>
                  <TextArea rows={4} placeholder="角色对你说的第一句话" value={form.opening_message} onChange={e => updateForm("opening_message", e.target.value)} /></div>
                <div><Text style={{ color: "#B08968", fontSize: 12 }}>语言风格 (speech_style)</Text>
                  <Input placeholder="如：温柔体贴、带点撒娇、语气冰冷" value={form.speech_style} onChange={e => updateForm("speech_style", e.target.value)} /></div>
              </div>
            </Card>

            {/* 世界与剧情 */}
            <Card size="small" title="世界与剧情" style={{ borderRadius: 12, background: "#fdf8f0", border: "1px solid #ead9c0" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div><Text style={{ color: "#B08968", fontSize: 12 }}>世界观 (world_view)</Text>
                  <Input placeholder="如：2047年赛博都市" value={form.world_view} onChange={e => updateForm("world_view", e.target.value)} /></div>
                <div><Text style={{ color: "#B08968", fontSize: 12 }}>关系引导 (relationship_guide)</Text>
                  <Input placeholder="如：青梅竹马、师徒、上司与下属" value={form.relationship_guide} onChange={e => updateForm("relationship_guide", e.target.value)} /></div>
              </div>
            </Card>

            {/* 高级 */}
            <Collapse items={[{ key: "advanced", label: "高级设置", children: (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div><Text style={{ color: "#B08968", fontSize: 12 }}>剧情节点 (story_nodes JSON)</Text>
                  <TextArea rows={3} value={form.story_nodes} onChange={e => updateForm("story_nodes", e.target.value)} /></div>
                <div><Text style={{ color: "#B08968", fontSize: 12 }}>扩展字段 (extensions JSON)</Text>
                  <TextArea rows={3} value={form.extensions} onChange={e => updateForm("extensions", e.target.value)} /></div>
              </div>
            )}]} style={{ background: "#fdf8f0", borderRadius: 12 }} />

            <Button type="primary" onClick={handleCreate} loading={loading} icon={<PlusOutlined />}
              style={{ height: 48, borderRadius: 24, background: "linear-gradient(135deg, #f6c177, #f0a860)", border: "none", fontSize: 16 }}>
              创建角色
            </Button>
          </div>
        )},
        { key: "import", label: "从文件导入角色卡", children: (
          <div>
            <Dragger {...uploadProps} style={{ padding: 40, borderRadius: 16, background: "#fdf8f0", border: "2px dashed #ead9c0" }}>
              <p className="ant-upload-drag-icon"><InboxOutlined style={{ fontSize: 48, color: "#B08968" }} /></p>
              <p style={{ color: "#5C4033", fontSize: 15 }}>点击或拖拽 .json / .png 文件</p>
              <p style={{ color: "#B08968", fontSize: 12 }}>支持 Tavern Card V2 和 PNG 内嵌角色卡</p>
            </Dragger>

            {importError && <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: "#fff1f0", color: "#cf1322", fontSize: 13 }}>{importError}</div>}

            {importPreview && (
              <Card size="small" style={{ marginTop: 16, borderRadius: 12, background: "#fdf8f0", border: "1px solid #ead9c0" }}>
                <Descriptions column={1} size="small" labelStyle={{ color: "#B08968" }} contentStyle={{ color: "#5C4033" }}>
                  <Descriptions.Item label="名称">{importPreview.name}</Descriptions.Item>
                  <Descriptions.Item label="人设">{importPreview.persona?.slice(0, 100)}</Descriptions.Item>
                  <Descriptions.Item label="开场白">{importPreview.greeting?.slice(0, 100)}</Descriptions.Item>
                  {importPreview.tags?.length > 0 && <Descriptions.Item label="标签">{importPreview.tags.join(", ")}</Descriptions.Item>}
                </Descriptions>
                <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                  <Button onClick={() => { setImportPreview(null); setImportFile(null); }} style={{ borderRadius: 12, color: "#B08968" }}>重新选择</Button>
                  <Button type="primary" loading={loading} onClick={handleConfirmImport}
                    style={{ borderRadius: 12, flex: 1, background: "linear-gradient(135deg, #f6c177, #f0a860)", border: "none" }}>
                    确认导入
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )},
      ]} />
    </Content>
    <BottomNav />
  </>);
}
