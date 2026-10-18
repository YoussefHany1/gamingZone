import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { sendChatMessage } from "../lib/aiService";
import { checkAILimit, getRemainingAILimit, incrementAILimit } from "../lib/aiLimit";
import type { ChatMessage } from "../types";
import { logger } from "@/src/lib/logger";

export type UseAIChatResult = {
  /** Full message history, including any system entries. */
  messages: ChatMessage[];
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  isLoading: boolean;
  /** Remaining messages for today, or null until the first check resolves. */
  remaining: number | null;
  /** Validates the daily limit, sends the message, and appends the reply. */
  handleSend: () => Promise<void>;
};

/**
 * Owns the AI chat conversation: message history, the draft input, the daily
 * usage limit, and the send flow (limit check → send → append reply).
 */
export function useAIChat(): UseAIChatResult {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    // Initial welcome message
    setMessages([{ role: "assistant", content: t("aiChat.placeholder") }]);
    getRemainingAILimit().then(setRemaining);
  }, [t]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    // 1. Check Limits
    const isAllowed = await checkAILimit();
    if (!isAllowed) {
      Alert.alert(t("common.error"), t("aiChat.limitReached"));
      return;
    }

    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const newChat = [...messages, userMsg];
    setMessages(newChat);
    setInput("");
    setIsLoading(true);

    try {
      // 2. Increment usage when sending request
      await incrementAILimit();
      setRemaining((prev) => (prev && prev > 0 ? prev - 1 : 0));

      // We only pass the user/assistant history to the model, limit to last 10
      const historyToPass = newChat.filter((m) => m.role !== "system").slice(-10);
      const reply = await sendChatMessage(historyToPass);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply.text, model: reply.model },
      ]);
    } catch (error) {
      logger.error("[useAIChat] Failed to send message", error);
      Alert.alert(t("common.error"), t("aiChat.error"));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, t]);

  return { messages, input, setInput, isLoading, remaining, handleSend };
}
