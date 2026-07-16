import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useLangStore } from "@/store/useLangStore";
import { ChatMessage } from "../types";

export function useChat() {
  const { lang, t } = useLangStore();
  const user = useAuthStore((state) => state.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading || !user) return;
    setErrorMsg(null);
    setModelUsed(null);

    const newUserMsg: ChatMessage = { role: "user", content: text };
    const updatedHistory = [...messages, newUserMsg];

    setMessages(updatedHistory);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: updatedHistory,
          uid: user.uid,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("aiChat.error"));
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.text },
      ]);
      setModelUsed(data.model);
      if (typeof data.remaining === "number") {
        setRemaining(data.remaining);
      }
    } catch (error: any) {
      console.error("AI chat client error:", error);
      setErrorMsg(error.message || t("aiChat.error"));
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setErrorMsg(null);
    setModelUsed(null);
  };

  return {
    messages,
    input,
    setInput,
    loading,
    errorMsg,
    modelUsed,
    remaining,
    messagesEndRef,
    handleSendMessage,
    clearChat,
    user,
    lang,
    t,
  };
}
