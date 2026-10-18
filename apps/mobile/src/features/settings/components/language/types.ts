import type { LanguageCode } from "../../lib/languages";

export type LanguageOptionRowProps = {
  code: LanguageCode;
  /** The language's own name, always shown in that language. */
  label: string;
  isSelected: boolean;
  onSelect: (code: LanguageCode) => void;
};
