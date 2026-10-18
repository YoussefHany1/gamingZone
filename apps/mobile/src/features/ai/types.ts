import type { ChatMessage as CoreChatMessage } from "@gaming-zone/core";

/**
 * The chat feature decorates core messages with a locally-generated id so list
 * rendering has stable keys — users often send duplicate texts, so positional
 * or content-based keys would both collide.
 */
export type ChatMessage = CoreChatMessage & { localId: string };

export type AILimitData = {
  date: string; // YYYY-MM-DD
  count: number;
};
