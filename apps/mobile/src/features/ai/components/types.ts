/**
 * Prop types for the AI chat component family.
 *
 * Kept beside the components (rather than the feature-level `types.ts`) so that
 * file stays limited to domain models.
 */
import type { ChatMessage } from "../types";

export type ChatMessageBubbleProps = {
  item: ChatMessage;
};

export type ChatSuggestionsProps = {
  /** Called with the chosen suggestion's text. */
  onSelect: (text: string) => void;
};

export type ChatInputBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  /** Remaining messages today; null until the first limit check resolves. */
  remaining: number | null;
  isLoading: boolean;
};
