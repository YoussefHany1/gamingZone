import React, { memo } from "react";
import { ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { APPEARANCE_IDS } from "@/src/constants/theme";
import { withAlpha } from "@/src/constants/colorUtils";
import { useThemeColors } from "@/src/hooks/useTheme";
import AppearanceTile from "./AppearanceTile";
import { geometry } from "./geometry";
import type { AppearanceTileStripProps } from "./types";

/** The horizontally scrolling row of appearance previews. */
const AppearanceTileStrip = memo(
  ({ appearance, palettes, onSelect }: AppearanceTileStripProps): React.ReactElement => {
    const colors = useThemeColors();
    const { t } = useTranslation();

    const ringTransparent = withAlpha(colors.accent, 0);

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={geometry.tilesScroll}
      >
        {APPEARANCE_IDS.map((id) => (
          <AppearanceTile
            key={id}
            id={id}
            label={t(`settings.theme.${id}`)}
            palette={palettes[id]!}
            isSelected={id === appearance}
            ringColor={colors.accent}
            ringTransparent={ringTransparent}
            labelColor={colors.textMuted}
            onPress={onSelect}
          />
        ))}
      </ScrollView>
    );
  },
);

AppearanceTileStrip.displayName = "AppearanceTileStrip";
export default AppearanceTileStrip;
