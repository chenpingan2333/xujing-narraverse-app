"use client";

import { useState, useRef, useCallback, KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setMessage("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [message, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 150) + "px";
  }, []);

  return (
    <div className="flex items-end gap-2 p-3 border-t border-paper-border bg-paper-light">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => { setMessage(e.target.value); handleInput(); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "输入你的消息……"}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none input-warm max-h-[150px]"
        style={{ fontFamily: "Georgia, Noto Serif SC, serif" }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        className="btn-warm h-10 px-4 shrink-0"
      >
        发送
      </button>
    </div>
  );
}
