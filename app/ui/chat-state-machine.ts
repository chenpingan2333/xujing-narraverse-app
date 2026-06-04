"use client";

import { useRef, useCallback, useState } from "react";
import { message as antMsg } from "antd";

/**
 * Chat Streaming Debouncer — prevents rapid state updates from crashing the UI.
 * Uses requestAnimationFrame batching for typewriter effects.
 */

export function useStreamingDebounce(updateFn: (text: string) => void) {
  const buffer = useRef("");
  const rafId = useRef<number | null>(null);
  const index = useRef(0);

  const startStreaming = useCallback((fullText: string, onComplete?: () => void) => {
    buffer.current = fullText;
    index.current = 0;
    if (rafId.current) cancelAnimationFrame(rafId.current);

    const tick = () => {
      index.current++;
      updateFn(fullText.slice(0, index.current));
      if (index.current < fullText.length) {
        rafId.current = requestAnimationFrame(tick);
      } else {
        onComplete?.();
      }
    };
    rafId.current = requestAnimationFrame(tick);
  }, [updateFn]);

  const stopStreaming = useCallback(() => {
    if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = null; }
    if (buffer.current) updateFn(buffer.current);
  }, [updateFn]);

  return { startStreaming, stopStreaming };
}

/**
 * Loading State Machine — manages chat lifecycle.
 * idle → thinking → streaming → done | error
 */
export type ChatState = "idle" | "thinking" | "streaming" | "done" | "error";

export interface ChatStateMachine {
  state: ChatState;
  transition: (next: ChatState) => void;
  reset: () => void;
  isBusy: boolean;
}

export function useChatStateMachine(): ChatStateMachine {
  const stateRef = useRef<ChatState>("idle");
  const [, forceRender] = useState(0);
  const transition = useCallback((next: ChatState) => { stateRef.current = next; forceRender((n) => n + 1); }, []);
  const reset = useCallback(() => transition("idle"), [transition]);
  return { state: stateRef.current, transition, reset, isBusy: stateRef.current === "thinking" || stateRef.current === "streaming" };
}

/**
 * Global Error Toast System — unified error display across all pages.
 */
export function useGlobalErrorToast() {
  const showError = useCallback((msg: string) => { antMsg.error({ content: msg, duration: 4, key: msg.slice(0, 20) }); }, []);
  const showWarning = useCallback((msg: string) => { antMsg.warning({ content: msg, duration: 3 }); }, []);
  const showSuccess = useCallback((msg: string) => { antMsg.success(msg, 2); }, []);
  return { showError, showWarning, showSuccess };
}

/**
 * Cancel token — wraps AbortController for fetch requests.
 */
export function createCancelToken(): { signal: AbortSignal; cancel: () => void; isCancelled: () => boolean } {
  const controller = new AbortController();
  let cancelled = false;
  return {
    signal: controller.signal,
    cancel: () => { cancelled = true; controller.abort(); },
    isCancelled: () => cancelled,
  };
}