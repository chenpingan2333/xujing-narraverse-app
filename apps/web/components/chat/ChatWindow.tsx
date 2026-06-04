"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import ChatBubble from "./ChatBubble";
import ChatInput from "./ChatInput";
import { apiPost } from "@/lib/api";
import type { CharacterItem } from "./CharacterList";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ChatResponse {
  reply: string;
  relationshipDelta: {
    affection: number;
    trust: number;
    intimacy: number;
    reason: string;
  };
  memoryEvents?: Array<{ type: string; content: string; importance: number }>;
  metadata: {
    sessionId: string;
    starCost?: number;
    isFirstMessage?: boolean;
    onboardingComplete?: boolean;
  };
}

interface ChatWindowProps {
  userId: string;
  character: CharacterItem;
  worldId?: string;
  onRelationshipUpdate?: (delta: { affection: number; trust: number; intimacy: number; reason: string }) => void;
}

export default function ChatWindow({ userId, character, worldId, onRelationshipUpdate }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(`sess-web-${Date.now()}`);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  const handleSend = useCallback(
    async (text: string) => {
      const userMsg: Message = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setStreamingText("");

      try {
        const data = await apiPost<ChatResponse>("/api/chat", {
          userId,
          characterId: character.id,
          message: text,
          sessionId,
          characterTier: character.tier ?? "basic",
          worldId: worldId ?? null,
        });

        // Simulate typewriter with the full reply string
        const reply = data.reply;
        let displayed = "";

        // Reveal characters one by one
        for (let i = 0; i < reply.length; i++) {
          displayed += reply[i];
          setStreamingText(displayed);
          await new Promise((r) => setTimeout(r, 25));
        }

        const assistantMsg: Message = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: reply,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setStreamingText(null);

        if (data.metadata.sessionId) {
          setSessionId(data.metadata.sessionId);
        }

        onRelationshipUpdate?.(data.relationshipDelta);
      } catch (err) {
        const errorMsg: Message = {
          id: `msg-error-${Date.now()}`,
          role: "assistant",
          content: err instanceof Error ? err.message : "发送失败，请稍后重试",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setStreamingText(null);
      } finally {
        setLoading(false);
      }
    },
    [userId, character, sessionId, worldId, onRelationshipUpdate]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-paper-border bg-paper-light flex items-center gap-3 shrink-0">
        <span className="text-2xl">{character.avatar}</span>
        <div>
          <p className="text-sm font-medium text-ink">{character.name}</p>
          <p className="text-xs text-ink-muted truncate max-w-[200px]">{character.persona}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {messages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full">
            <p className="text-ink-muted text-sm animate-soft-fade-in">
              开始和 {character.name} 对话吧 ✨
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatBubble key={msg.id} role={msg.role} content={msg.content} />
        ))}

        {/* Streaming message placeholder */}
        {streamingText !== null && (
          <div className="flex justify-start mb-3 animate-soft-fade-in">
            <div className="max-w-[75%] px-4 py-3 text-[14px] leading-relaxed chat-bubble-ai">
              {streamingText}
              <span className="animate-blink ml-0.5">|</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={loading}
        placeholder={`对 ${character.name} 说点什么……`}
      />
    </div>
  );
}
