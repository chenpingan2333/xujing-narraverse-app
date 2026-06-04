"use client";

import Typewriter from "./Typewriter";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  useTypewriter?: boolean;
  onTypewriterDone?: () => void;
}

export default function ChatBubble({ role, content, useTypewriter, onTypewriterDone }: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3 animate-soft-fade-in`}>
      <div
        className={`max-w-[75%] px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? "chat-bubble-user"
            : "chat-bubble-ai chat-bubble-breathe"
        }`}
      >
        {!isUser && useTypewriter ? (
          <Typewriter text={content} speed={25} onComplete={onTypewriterDone} />
        ) : (
          content
        )}
      </div>
    </div>
  );
}
