import type { Appearance, AccentId, ConcreteAccentId } from "@/src/constants/theme";
import type { ThemeColors } from "@/src/constants/colors";
import type { AppearancePalettes } from "../../hooks/useAppearancePalettes";

export type AppearanceTileProps = {
  id: Appearance;
  label: string;
  /** The palette this tile is previewing — not the active one. */
  palette: ThemeColors;
  isSelected: boolean;
  ringColor: string;
  ringTransparent: string;
  labelColor: string;
  onPress: (id: Appearance) => void;
};

export type AppearanceTileStripProps = {
  appearance: Appearance;
  palettes: AppearancePalettes;
  onSelect: (appearance: Appearance) => void;
};

export type AccentSwatchRowProps = {
  accent: AccentId;
  /** What `accent` resolves to, so "random" can preview its roll. */
  resolvedAccent: ConcreteAccentId | "auto";
  onSelect: (accent: AccentId) => void;
};
