/** Shared chat identity and document shapes. Pure runtime helpers only. */

export type ConversationType = "dm" | "group";
export type MessageType = "text" | "game_suggestion" | "system";

/** Deterministic direct-message conversation id. */
export function dmKey(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join("_");
}

export interface Conversation {
  id: string;
  type: ConversationType;
  title: string | null;
  photoURL: string | null;
  members: string[];
  admins: string[];
  dmKey: string | null;
  lastMessage: {
    senderId: string;
    text: string;
    type: MessageType;
    createdAt: number | null;
  } | null;
  lastMessageAt: number | null;
}

export interface SocialMessage {
  id: string;
  senderId: string;
  text: string;
  type: MessageType;
  gameId?: string | number;
  gameName?: string;
  coverImageId?: string | null;
  createdAt: number | null;
  editedAt: number | null;
  deletedAt: number | null;
  deletedFor: string[];
}

export interface ReadPosition {
  lastReadAt: number | null;
}
