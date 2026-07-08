export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
};

export type AILimitData = {
  date: string; // YYYY-MM-DD
  count: number;
};
