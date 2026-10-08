import React, { memo, useCallback, useMemo } from "react";
import { View, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Dices, Sparkles, Check } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useThemeStore } from "@/src/store/useThemeStore";
import {
  ACCENTS,
  ACCENT_IDS,
  APPEARANCE_IDS,
  resolveAppearancePalette,
  type AccentId,
  type Appearance,
} from "@/src/constants/theme";
import { readableForeground, withAlpha } from "@/src/constants/colorUtils";
import type { ThemeColors } from "@/src/constants/colors";
import LatestNews from "@/src/features/news/components/LatestNews";
import type { Article } from "@/src/features/news/types";

const ACCENT_OPTIONS: AccentId[] = ["auto", "random", ...ACCENT_IDS];

// ─── Layout constants ─────────────────────────────────────────────────────────

const INSET = 20;

const TILE_SIZE = 52;
const TILE_RADIUS = 14;
const TILE_RING = 2.5;
const TILE_PAD = 3;

const SWATCH = 32;
const SWATCH_HIT = SWATCH + 16;
const SWATCH_GAP = 10;

// ─── Static geometry (theme-independent) ─────────────────────────────────────

const g = StyleSheet.create({
  // preview
  previewWrapper: {
    marginHorizontal: INSET,
    marginTop: 16,
    borderRadius: 20,
    overflow: "hidden",
  },
  previewInner: {
    paddingVertical: 2,
  },

  // tile strip
  tilesScroll: {
    paddingHorizontal: INSET,
    paddingTop: 20,
    paddingBottom: 4,
    gap: 10,
    flexDirection: "row",
  },
  tileWrapper: {
    alignItems: "center",
    gap: 6,
  },
  tileTouchable: {
    padding: TILE_PAD,
    borderWidth: TILE_RING,
    borderRadius: TILE_RADIUS + TILE_RING + TILE_PAD,
  },
  tileSwatch: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: TILE_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tileLabel: {
    fontSize: 10,
    textAlign: "center",
    maxWidth: TILE_SIZE + TILE_PAD * 2 + TILE_RING * 2,
  },
  tileStripe: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: TILE_SIZE * 0.35,
  },
  tileDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tileCheck: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  // description block
  descBlock: {
    marginTop: 20,
    paddingHorizontal: INSET,
    alignItems: "center",
    gap: 4,
  },

  // accent section
  accentSection: {
    paddingHorizontal: INSET,
    paddingTop: 28,
  },
  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SWATCH_GAP,
    marginTop: 10,
  },
  swatchCol: {
    alignItems: "center",
    gap: 4,
  },
  swatchHit: {
    width: SWATCH_HIT,
    height: SWATCH_HIT,
    borderRadius: SWATCH_HIT / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchCircle: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchLabel: {
    fontSize: 10,
    textAlign: "center",
  },
});

// ─── Single appearance tile ────────────────────────────────────────────────────

const AppearanceTile = memo(function AppearanceTile({
  id,
  label,
  palette,
  isSelected,
  ringColor,
  ringTransparent,
  labelColor,
  onPress,
}: {
  id: Appearance;
  label: string;
  palette: ThemeColors;
  isSelected: boolean;
  ringColor: string;
  ringTransparent: string;
  labelColor: string;
  onPress: (id: Appearance) => void;
}) {
  const handlePress = useCallback(() => onPress(id), [id, onPress]);

  return (
    <View style={g.tileWrapper}>
      <TouchableOpacity
        style={[
          g.tileTouchable,
          { borderColor: isSelected ? ringColor : ringTransparent },
        ]}
        onPress={handlePress}
        activeOpacity={0.75}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={label}
      >
        {/* Main swatch: background fill */}
        <View style={[g.tileSwatch, { backgroundColor: palette.background }]}>
          {/* Surface stripe at the bottom */}
          <View style={[g.tileStripe, { backgroundColor: palette.surface }]} />
          {/* Accent dot at top-right */}
          <View style={[g.tileDot, { backgroundColor: palette.accent }]} />
          {/* Check mark when selected */}
          {isSelected && (
            <View style={[g.tileCheck, { backgroundColor: palette.accent }]}>
              <Check size={10} color={palette.onAccent} strokeWidth={3} />
            </View>
          )}
        </View>
      </TouchableOpacity>
      <CustomText style={[g.tileLabel, { color: labelColor }]} numberOfLines={2}>
        {label}
      </CustomText>
    </View>
  );
});
AppearanceTile.displayName = "AppearanceTile";

// ─── Main screen ──────────────────────────────────────────────────────────────

const ThemeScreen = memo((): React.ReactElement => {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();

  const appearance = useThemeStore((state) => state.appearance);
  const accent = useThemeStore((state) => state.accent);
  const resolvedAccent = useThemeStore((state) => state.resolvedAccent);
  const systemScheme = useThemeStore((state) => state.systemScheme);
  const setAppearance = useThemeStore((state) => state.setAppearance);
  const setAccent = useThemeStore((state) => state.setAccent);

  const styles = useThemeStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      paddingBottom: 70,
    },
    previewFrame: {
      backgroundColor: c.background,
      borderColor: c.border,
      borderWidth: 1,
      height: 370,
    },
    themeName: {
      fontSize: 17,
      fontWeight: "700",
      color: c.text,
      textAlign: "center",
    },
    themeNote: {
      fontSize: 12,
      lineHeight: 17,
      color: c.textMuted,
      textAlign: "center",
    },
    sectionDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginHorizontal: INSET,
      marginTop: 28,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      color: c.textMuted,
    },
    swatchSelected: {
      borderWidth: 2.5,
      borderColor: c.text,
    },
  }));

  // Stable so tiles keep their memo. The switch is applied synchronously: the
  // touch feedback is a native animation, so nothing on the press path has to
  // wait for this update to be scheduled on the next tick.
  const handleSelect = useCallback(
    (next: Appearance) => setAppearance(next),
    [setAppearance],
  );
  const handleSelectAccent = useCallback(
    (next: AccentId) => setAccent(next),
    [setAccent],
  );

  /**
   * The concrete fill for each accent swatch.
   * `auto` → active accent  |  `random` → the rolled accent for this session
   */
  const swatchColor = useCallback(
    (id: AccentId): string => {
      if (id === "auto") return colors.accent;
      if (id === "random")
        return resolvedAccent === "auto" ? ACCENTS.blue : ACCENTS[resolvedAccent];
      return ACCENTS[id];
    },
    [colors.accent, resolvedAccent],
  );

  // Pre-resolve every appearance palette so each tile can be fully memoised.
  const palettes = useMemo(() => {
    const map: Record<string, ThemeColors> = {};
    for (const id of APPEARANCE_IDS) {
      map[id] = resolveAppearancePalette(id, systemScheme, resolvedAccent);
    }
    return map;
  }, [systemScheme, resolvedAccent]);

  const mockArticles = useMemo<Article[]>(() => {
    const thumbnails = [
      "https://platform.theverge.com/wp-content/uploads/sites/2/2026/10/gta6.jpg?quality=90&strip=all&crop=0%2C0%2C100%2C100&w=750",
      "https://www.reuters.com/resizer/v2/F4VN364ZPZINBOP2IY5H6GFNJA.jpg?auth=825ae9f636bb0b385f79ca589d5b9da16f83c3cecd9fb8e2caed75f127ff901f&width=640&quality=80",
      "https://www.club386.com/wp-content/uploads/2026/10/AMD-Ryzen-Z1-gaming-handheld-696x696.jpg",
    ];
    return ["mock-1", "mock-2", "mock-3"].map(($id, index) => ({
      $id,
      category: "",
      title: t("settings.theme.previewHeadline").substring(0, 100),
      description: `${t("settings.theme.previewSummary")}..`,
      pubDate: new Date(
        Date.now() - (index === 0 ? 2 : 5) * 60 * 60 * 1000,
      ).toISOString(),
      siteName: t("settings.theme.previewSite"),
      thumbnail: thumbnails[index] || "",
    }));
  }, [t]);

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "right", "left"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Live preview painted with the ACTIVE palette ─────────── */}
        <View style={[g.previewWrapper, styles.previewFrame]}>
          <View pointerEvents="none">
            <LatestNews
              limit={3}
              language={i18n.language}
              showDropdown={false}
              showHeaderTitle={false}
              showFooter={false}
              scrollEnabled={false}
              websitesList={[]}
              mockData={mockArticles}
            />
          </View>
        </View>

        {/* ── Appearance tile strip ────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={g.tilesScroll}
        >
          {APPEARANCE_IDS.map((id) => (
            <AppearanceTile
              key={id}
              id={id}
              label={t(`settings.theme.${id}`)}
              palette={palettes[id]!}
              isSelected={id === appearance}
              ringColor={colors.accent}
              ringTransparent={withAlpha(colors.accent, 0)}
              labelColor={colors.textMuted}
              onPress={handleSelect}
            />
          ))}
        </ScrollView>

        {/* ── Selected name + sync note ─────────────────────────────── */}
        <View style={g.descBlock}>
          <CustomText style={styles.themeName}>
            {t(`settings.theme.${appearance}`)}
          </CustomText>
          <CustomText style={styles.themeNote}>{t("settings.theme.syncNote")}</CustomText>
        </View>

        {/* ── Divider ───────────────────────────────────────────────── */}
        <View style={styles.sectionDivider} />

        {/* ── Accent swatches ───────────────────────────────────────── */}
        <View style={g.accentSection}>
          <CustomText style={styles.sectionTitle}>
            {t("settings.theme.accentTitle")}
          </CustomText>

          <View style={g.swatchRow}>
            {ACCENT_OPTIONS.map((id) => {
              const isSelected = accent === id;
              const fill = swatchColor(id);
              return (
                <View key={id} style={g.swatchCol}>
                  <TouchableOpacity
                    style={g.swatchHit}
                    onPress={() => handleSelectAccent(id)}
                    activeOpacity={0.75}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={t(`settings.theme.${id}`)}
                  >
                    <View
                      style={[
                        g.swatchCircle,
                        { backgroundColor: fill },
                        isSelected ? styles.swatchSelected : null,
                      ]}
                    >
                      {id === "random" && (
                        <Dices size={SWATCH / 2} color={readableForeground(fill)} />
                      )}
                      {id === "auto" && (
                        <Sparkles size={SWATCH / 2} color={readableForeground(fill)} />
                      )}
                      {isSelected && id !== "random" && id !== "auto" && (
                        <Check
                          size={SWATCH / 2.2}
                          color={readableForeground(fill)}
                          strokeWidth={3}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                  <CustomText style={[g.swatchLabel, { color: colors.textMuted }]}>
                    {t(`settings.theme.${id}`)}
                  </CustomText>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
});
ThemeScreen.displayName = "ThemeScreen";
export default ThemeScreen;
