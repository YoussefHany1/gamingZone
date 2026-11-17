/**
 * AI chat client — talks to the backend's `/ai/chat` proxy.
 *
 * Provider keys (Gemini / Groq) live ONLY in the backend environment. The
 * previous implementation read `EXPO_PUBLIC_*` keys and called the providers
 * directly from the app, which put both secrets inside the shipped APK where
 * anyone could extract them. The server now verifies the caller's Firebase ID
 * token, builds the personalised context server-side, and returns the same
 * `{ text, model }` shape this module has always exposed.
 */
import apiClient from "@/src/services/api/client";
import { getBackendIdToken } from "@/src/services/api/authToken";
import { logger } from "@/src/lib/logger";
import type { ChatMessage } from "@gaming-zone/core";

export type AiChatResponse = {
  text: string;
  model: string;
};

/**
 * Main exposed function: sends the (user/assistant only) history to the
 * backend proxy and returns the assistant reply.
 */
export async function sendChatMessage(
  history: ChatMessage[],
): Promise<{ text: string; model: string }> {
  const token = await getBackendIdToken();
  if (!token) {
    throw new Error("Sign in required for the AI assistant.");
  }

  // Strip local-only fields (localId) — the wire contract is { role, content }.
  const wireHistory = history.map(({ role, content }) => ({ role, content }));

  try {
    // AI generation regularly exceeds the shared 10s client timeout.
    const { data } = await apiClient.post<AiChatResponse>(
      "/ai/chat",
      { history: wireHistory },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30_000,
      },
    );
    return { text: data.text, model: data.model };
  } catch (error: unknown) {
    logger.error("[aiService] Backend AI request failed", error as Error);
    throw new Error("All AI providers are currently unavailable.");
  }
}
