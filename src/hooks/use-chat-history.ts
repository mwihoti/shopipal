"use client";
import { useEffect, useRef, useState } from "react";
import {
  CHAT_STORAGE_KEY,
  parseChatHistory,
  serializeChatHistory,
  type ChatHistory,
} from "@/lib/chat-history";

export function useChatHistory({
  messages,
  budget,
  draft,
  enabled,
  restore,
}: ChatHistory & {
  enabled: boolean;
  restore: (history: ChatHistory) => void;
}) {
  const [ready, setReady] = useState(false);
  const latest = useRef<ChatHistory | null>(null);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (enabled) {
        try {
          const raw = localStorage.getItem(CHAT_STORAGE_KEY);
          const saved = raw ? parseChatHistory(raw) : null;
          if (saved) restore(saved);
        } catch {
          /* Browsing still works when storage is unavailable. */
        }
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [enabled, restore]);

  useEffect(() => {
    if (!ready || !enabled) return;
    const value = { messages, budget, draft };
    latest.current = value;
    const timer = window.setTimeout(() => save(value), 200);
    return () => window.clearTimeout(timer);
  }, [ready, enabled, messages, budget, draft]);

  useEffect(() => {
    if (!enabled) return;
    const flush = () => {
      if (latest.current) save(latest.current);
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [enabled]);
  return ready;
}
function save(value: ChatHistory) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, serializeChatHistory(value));
  } catch {
    /* Quota limits must not interrupt shopping. */
  }
}
