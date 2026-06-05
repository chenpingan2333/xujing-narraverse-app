"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "../../../components/navigation/BackButton";
import BottomNav from "../../../components/navigation/BottomNav";
import { Layout, Typography, Button, Input, Select, Card, Steps, message as antMsg } from "antd";
import { PlusOutlined, ArrowLeftOutlined, ArrowRightOutlined, CheckOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { Content } = Layout;
const { TextArea } = Input;

const WORLD_TYPES = [
  { value: "modern", label: "现代/都市恋爱" },
  { value: "xianxia", label: "古风/仙侠修真" },
  { value: "fantasy", label: "西幻/魔法冒险" },
  { value: "wasteland", label: "末日/废土" },
  { value: "workplace", label: "职场/修罗场" },
  { value: "custom", label: "自定义" },
];

const cardStyle = { borderRadius: 12, background: "#fdf8f0", border: "1px solid #ead9c0" };
const labelStyle: React.CSSProperties = { color: "#B08968", fontSize: 12, display: "block", marginBottom: 4 };

export default function WorldCreatePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    world_name: "", display_name: "", description: "",
    world_type: "modern", custom_type: "",
    ai_role: "", user_role: "", premise: "",
    world_rules: "", hierarchy: "", glossary: "", atmosphere: "",
  });
  const [promptPreview, setPromptPreview] = useState("");

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const buildSystemPrompt = () => {
    const type = form.world_type === "custom" ? form.custom_type : WORLD_TYPES.find(t => t.value === form.world_type)?.label || form.world_type;
    const rules = form.world_rules ? form.world_rules.split("\n").filter(Boolean).map((r, i) => (i + 1) + ". " + r.trim()).join("\n") : "";
    return "# 世界设定：" + form.world_name + "\n\n" +
      "- 类型：" + type + "\n" +
      "- AI角色：" + form.ai_role + "\n" +
      "- 用户角色：" + form.user_role + "\n" +
      "- 当前处境：" + form.premise + "\n" +
      (rules ? "\n[Rules]\n" + rules + "\n" : "") +
      (form.hierarchy ? "\n[Hierarchy]\n" + form.hierarchy + "\n" : "") +
      (form.glossary ? "\n[Glossary]\n" + form.glossary + "\n" : "") +
      (form.atmosphere ? "\n[Atmosphere]\n" + form.atmosphere + "\n" : "");
  };

  const handleCreate = async () => {
    if (!form.world_name.trim()) { antMsg.warning("请输入世界名称"); return; }
    setLoading(true);
    try {
      const systemPrompt = buildSystemPrompt();
      const body = {
        world_name: form.world_name, display_name: form.display_name || form.world_name,
        description: form.description,
        world_type: form.world_type === "custom" ? form.custom_type : form.world_type,
        ai_role: form.ai_role, user_role: form.user_role, premise: form.premise,
        rules: form.world_rules ? form.world_rules.split("\n").filter(Boolean) : [],
        hierarchy: form.hierarchy,
        glossary: form.glossary ? Object.fromEntries(form.glossary.split("\n").filter(Boolean).map((l: string) => { const [k,v] = l.split("="); return [k?.trim(), v?.trim()]; })) : {},
        atmosphere: form.atmosphere, system_prompt: systemPrompt,
      };
      const res = await fetch("/api/worlds/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) {
        antMsg.success("世界包创建成功！");
        console.log("[WORLD_CREATED] name=" + form.world_name + " type=" + form.world_type);
        router.push("/worlds");
      } else { antMsg.error(data.error || "创建失败"); }
    } catch { antMsg.error("网络错误"); }
    finally { setLoading(false); }
  };

  const steps = [
    { title: "基础信息" },
    { title: "关系设定" },
    { title: "高级设置" },
  ];

  const canNext = step === 0 ? !!form.world_name.trim() : step === 1 ? !!form.ai_role.trim() : true;

  return (<>
    <Content className="page-scroll" style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px 100px", minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24, gap: 12 }}>
        <BackButton />
        <Title level={4} style={{ margin: 0, color: "#5C4033", fontFamily: "'Georgia','Noto Serif SC',serif", letterSpacing: 3 }}>创建世界包</Title>
      </div>

      <Steps current={step} items={steps} style={{ marginBottom: 24 }} size="small" />

      {/* Step 0: 基础信息 */}
      {step === 0 && (
        <Card size="small" title="Step 1 — 基础信息" style={cardStyle}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div><Text style={labelStyle}>世界名称 *</Text>
              <Input placeholder="世界的内部名称" value={form.world_name} onChange={e => update("world_name", e.target.value)} /></div>
            <div><Text style={labelStyle}>展示名称</Text>
              <Input placeholder="用户看到的世界名" value={form.display_name} onChange={e => update("display_name", e.target.value)} /></div>
            <div><Text style={labelStyle}>描述</Text>
              <TextArea rows={2} placeholder="简单描述这个世界" value={form.description} onChange={e => update("description", e.target.value)} /></div>
            <div><Text style={labelStyle}>世界类型</Text>
              <Select value={form.world_type} onChange={v => update("world_type", v)} options={WORLD_TYPES} style={{ width: "100%" }} />
              {form.world_type === "custom" && <Input placeholder="输入自定义类型" value={form.custom_type} onChange={e => update("custom_type", e.target.value)} style={{ marginTop: 8 }} />}
            </div>
          </div>
        </Card>
      )}

      {/* Step 1: 关系设定 */}
      {step === 1 && (
        <Card size="small" title="Step 2 — 关系设定" style={cardStyle}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div><Text style={labelStyle}>AI 角色身份</Text>
              <Input placeholder="AI 扮演什么身份？（如：冷面侠女、温柔学姐）" value={form.ai_role} onChange={e => update("ai_role", e.target.value)} /></div>
            <div><Text style={labelStyle}>用户身份</Text>
              <Input placeholder="用户是什么身份？（如：宗门弟子、转学生）" value={form.user_role} onChange={e => update("user_role", e.target.value)} /></div>
            <div><Text style={labelStyle}>当前剧情（一句话）</Text>
              <Input placeholder="如：宗门大比前夕，你意外发现了一个秘密" value={form.premise} onChange={e => update("premise", e.target.value)} /></div>
          </div>
        </Card>
      )}

      {/* Step 2: 高级设置 */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card size="small" title="Step 3 — 高级设置（可选）" style={cardStyle}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><Text style={labelStyle}>世界法则（每行一条）</Text>
                <TextArea rows={3} placeholder={"灵力至上\n科技禁绝情感"} value={form.world_rules} onChange={e => update("world_rules", e.target.value)} /></div>
              <div><Text style={labelStyle}>等级体系</Text>
                <TextArea rows={2} placeholder={"练气→筑基→金丹→元婴→化神"} value={form.hierarchy} onChange={e => update("hierarchy", e.target.value)} /></div>
              <div><Text style={labelStyle}>词典（每行 key=value）</Text>
                <TextArea rows={3} placeholder={"灵力=世界的本源能量\n神识=精神力扫描"} value={form.glossary} onChange={e => update("glossary", e.target.value)} /></div>
              <div><Text style={labelStyle}>环境氛围</Text>
                <Input placeholder={"阴雨连绵的废墟都市"} value={form.atmosphere} onChange={e => update("atmosphere", e.target.value)} /></div>
            </div>
          </Card>

          {promptPreview && (
            <Card size="small" title="生成的 System Prompt" style={{ ...cardStyle, whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 12, color: "#5C4033" }}>
              {promptPreview}
            </Card>
          )}
          <Button onClick={() => setPromptPreview(buildSystemPrompt())} style={{ borderRadius: 24, background: "#fdf8f0", border: "1px solid #ead9c0", color: "#B08968" }}>预览 System Prompt</Button>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        {step > 0 && (
          <Button icon={<ArrowLeftOutlined />} onClick={() => setStep(s => s - 1)} style={{ borderRadius: 24, background: "#fdf8f0", border: "1px solid #ead9c0", color: "#B08968" }}>上一步</Button>
        )}
        {step < 2 ? (
          <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => setStep(s => s + 1)} disabled={!canNext}
            style={{ borderRadius: 24, flex: 1, background: "linear-gradient(135deg, #f6c177, #f0a860)", border: "none" }}>下一步</Button>
        ) : (
          <Button type="primary" icon={<CheckOutlined />} loading={loading} onClick={handleCreate}
            style={{ borderRadius: 24, flex: 1, height: 48, background: "linear-gradient(135deg, #f6c177, #f0a860)", border: "none", fontSize: 16 }}>创建世界包</Button>
        )}
      </div>
    </Content>
    <BottomNav />
  </>);
}
