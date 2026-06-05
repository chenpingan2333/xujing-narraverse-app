"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import BackButton from "../../../components/navigation/BackButton";
import BottomNav from "../../../components/navigation/BottomNav";
import { Layout, Typography, Button, Card, Tag, Space, Upload, message as antMsg, Descriptions, Alert } from "antd";
import { InboxOutlined, FileAddOutlined, DownloadOutlined, CheckCircleOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;
const { Dragger } = Upload;

interface ImportPreviewData {
  source: string;
  name: string;
  persona: string;
  description: string;
  greeting: string;
  speechStyle: string;
  worldView: string;
  tags: string[];
}

export default function ImportPage() {
  const router = useRouter();
  const [preview, setPreview] = useState<ImportPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch("/api/characters/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json }),
      });
      const data = await res.json();
      if (res.ok) {
        setPreview(data.preview);
      } else {
        setError(data.error ?? "导入失败");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "无法解析 JSON 文件");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleConfirm = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      const res = await fetch("/api/characters/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: preview, confirm: true }),
      });
      const data = await res.json();
      if (res.ok) {
        antMsg.success("角色导入成功！");
        router.push("/characters");
      } else {
        antMsg.error(data.error ?? "导入失败");
      }
    } catch {
      antMsg.error("网络连接失败");
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    name: "file",
    multiple: false,
    accept: ".json",
    showUploadList: false,
    beforeUpload(file) {
      handleFile(file);
      return false;
    },
  };

  return (
    <>
    <Content className="page-scroll" style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px 100px", minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24, gap: 12 }}>
        <BackButton />
        <Title level={4} style={{ margin: 0, color: "#5C4033", fontWeight: 400, fontFamily: "'Georgia','Noto Serif SC',serif", letterSpacing: 3 }}>
          导入角色卡
        </Title>
      </div>

      {!preview ? (
        <>
          <Dragger {...uploadProps} style={{ padding: 40, borderRadius: 16, background: "#fdf8f0", border: "2px dashed #ead9c0" }}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ fontSize: 48, color: "#B08968" }} />
            </p>
            <p style={{ color: "#5C4033", fontSize: 15 }}>点击或拖拽 .json 文件到此处</p>
            <p style={{ color: "#B08968", fontSize: 12 }}>
              支持 Tavern Character Card V2 和 Chub.ai 格式
            </p>
          </Dragger>

          {error && (
            <Alert message={error} type="error" showIcon style={{ marginTop: 16, borderRadius: 12 }} />
          )}
        </>
      ) : (
        <>
          <Card style={{ borderRadius: 16, background: "#fdf8f0", border: "1px solid #ead9c0", marginBottom: 16 }}>
            <Descriptions column={1} size="small" labelStyle={{ color: "#B08968", fontWeight: 500 }} contentStyle={{ color: "#5C4033" }}>
              <Descriptions.Item label="来源">{preview.source === "tavern" ? "Tavern V2" : preview.source === "chub" ? "Chub.ai" : "未知"}</Descriptions.Item>
              <Descriptions.Item label="名称">{preview.name}</Descriptions.Item>
              <Descriptions.Item label="人设">{preview.persona}</Descriptions.Item>
              <Descriptions.Item label="开场白">{preview.greeting}</Descriptions.Item>
              {preview.speechStyle && <Descriptions.Item label="说话风格">{preview.speechStyle}</Descriptions.Item>}
              {preview.worldView && <Descriptions.Item label="世界观">{preview.worldView}</Descriptions.Item>}
              {preview.tags && preview.tags.length > 0 && (
                <Descriptions.Item label="标签">
                  <Space wrap>{preview.tags.map((t: string) => <Tag key={t} style={{ borderRadius: 6 }}>{t}</Tag>)}</Space>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <div style={{ display: "flex", gap: 12 }}>
            <Button
              onClick={() => { setPreview(null); setError(null); }}
              style={{ borderRadius: 12, background: "#fdf8f0", border: "1px solid #ead9c0", color: "#B08968" }}
            >
              重新选择
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={loading}
              onClick={handleConfirm}
              style={{
                borderRadius: 12, flex: 1,
                background: "linear-gradient(135deg, #f6c177, #f0a860)",
                border: "none", color: "#fffdf9",
              }}
            >
              确认导入
            </Button>
          </div>
        </>
      )}
    </Content>
    <BottomNav />
    </>
  );
}