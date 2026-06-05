"use client";

import { useState, useEffect } from "react";
import BackButton from "../../components/navigation/BackButton";
import BottomNav from "../../components/navigation/BottomNav";
import { Layout, Typography, Button, Input, Card, message as antMsg, Tag, Divider } from "antd";
import { KeyOutlined, CrownOutlined, SaveOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { Content } = Layout;

export default function SettingsPage() {
  const [settings, setSettings] = useState({ openai_base_url: "", anthropic_base_url: "", openai_api_key: "",
            anthropic_api_key: "" });
  const [isVip, setIsVip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        setIsVip(data.isVip || false);
        if (data.apiSettings) {
          setSettings({
            openai_base_url: data.apiSettings.openai_base_url || "",
            anthropic_base_url: data.apiSettings.anthropic_base_url || "",
            openai_api_key: "",
            anthropic_api_key: "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        antMsg.success("API 设置已保存");
      } else {
        antMsg.error("保存失败");
      }
    } catch { antMsg.error("网络错误"); }
    finally { setSaving(false); }
  };

  return (<>
    <Content className="page-scroll" style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px 100px", minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24, gap: 12 }}>
        <BackButton />
        <Title level={4} style={{ margin: 0, color: "#5C4033", fontFamily: "'Georgia','Noto Serif SC',serif", letterSpacing: 3 }}>设置</Title>
      </div>

      <Card size="small" title={<span><KeyOutlined style={{ marginRight: 8 }} />API 密钥设置</span>}
        style={{ borderRadius: 12, background: "#fdf8f0", border: "1px solid #ead9c0", marginBottom: 16 }}>

        {isVip ? (
          <div style={{ textAlign: "center", padding: 20 }}>
            <CrownOutlined style={{ fontSize: 32, color: "#f0a860" }} />
            <Title level={5} style={{ color: "#5C4033", marginTop: 12 }}>您是 VIP 会员</Title>
            <Text style={{ color: "#B08968" }}>专属模型通道已自动配置</Text>
            <Tag color="gold" style={{ marginTop: 8, fontSize: 12, borderRadius: 8 }}>VIP 已激活</Tag>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <Text style={{ color: "#B08968", fontSize: 12, display: "block", marginBottom: 4 }}>OpenAI Compatible Base URL</Text>
              <Input placeholder="https://api.openai.com/v1" value={settings.openai_base_url}
                onChange={e => setSettings(s => ({ ...s, openai_base_url: e.target.value }))} />
            </div>
            <div>
              <Text style={{ color: "#B08968", fontSize: 12, display: "block", marginBottom: 4 }}>Anthropic Compatible Base URL</Text>
              <Input placeholder="https://api.anthropic.com" value={settings.anthropic_base_url}
                onChange={e => setSettings(s => ({ ...s, anthropic_base_url: e.target.value }))} />
            </div>
            <div>
              <Text style={{ color: "#B08968", fontSize: 12, display: "block", marginBottom: 4 }}>API Key</Text>
              <div>
              <Text style={{ color: "#B08968", fontSize: 12, display: "block", marginBottom: 4 }}>OpenAI API Key</Text>
              <Input.Password placeholder="sk-..." value={settings.openai_api_key}
                onChange={e => setSettings(s => ({ ...s, openai_api_key: e.target.value }))} />
            </div>
            <div>
              <Text style={{ color: "#B08968", fontSize: 12, display: "block", marginBottom: 4 }}>Anthropic API Key</Text>
              <Input.Password placeholder="sk-ant-..." value={settings.anthropic_api_key}
                onChange={e => setSettings(s => ({ ...s, anthropic_api_key: e.target.value }))} />
            </div>
            </div>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}
              style={{ borderRadius: 24, background: "linear-gradient(135deg, #f6c177, #f0a860)", border: "none", height: 44 }}>
              保存设置
            </Button>
          </div>
        )}
      </Card>

      <Text style={{ color: "#c4a68a", fontSize: 11, textAlign: "center", display: "block" }}>
        如果填写 API Key → 优先使用自定义模型；未填写 → 使用系统默认渠道
      </Text>
    </Content>
    <BottomNav />
  </>);
}
