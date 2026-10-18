import type { FeedbackType } from "../../types";

export type FeedbackTypeSelectorProps = {
  value: FeedbackType;
  onChange: (type: FeedbackType) => void;
};

export type FeedbackMessageFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
};

export type ContactEmailFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
};

export type ContactSubmitButtonProps = {
  isSending: boolean;
  onPress: () => void;
};
