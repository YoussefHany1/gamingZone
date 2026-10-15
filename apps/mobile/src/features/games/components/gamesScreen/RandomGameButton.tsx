import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { CalendarDays, Shuffle, Star, X } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { igdbImageUrl } from "@gaming-zone/utils";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { fetchRandomGame } from "@/src/services/api/igdbApi";
import type { Game } from "@/src/types/sharedTypes";

/**
 * Search-row button that suggests a completely random game. Tapping it asks the
 * backend for one random game and presents it inside a themed modal with cover
 * art, quick stats and options to roll again or open the full game details.
 */
function RandomGameButton(): React.ReactElement {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const navigation = useNavigation<any>();
  const [randomLoading, setRandomLoading] = useState(false);
  const [suggestedGame, setSuggestedGame] = useState<Game | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);

  const styles = useThemeStyles((c) => ({
    button: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.72)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    card: {
      width: "100%",
      maxWidth: 380,
      backgroundColor: c.background,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
      paddingBottom: 16,
      elevation: 12,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
    },
    closeButton: {
      position: "absolute",
      top: 12,
      right: 12,
      zIndex: 2,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      marginTop: 16,
      marginHorizontal: 16,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      backgroundColor: c.accentSurface,
      borderWidth: 1,
      borderColor: c.border,
    },
    badgeText: {
      color: c.accentText,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    coverWrapper: {
      marginTop: 12,
      marginHorizontal: 16,
      height: 220,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: c.backgroundDeep,
    },
    cover: {
      width: "100%",
      height: "100%",
    },
    coverGradient: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "55%",
    },
    coverTitleWrapper: {
      position: "absolute",
      left: 12,
      right: 12,
      bottom: 12,
    },
    title: {
      color: "#ffffff",
      fontSize: 20,
      fontWeight: "bold",
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 14,
      marginHorizontal: 16,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      backgroundColor: c.backgroundDeep,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipText: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 18,
      marginHorizontal: 16,
    },
    buttonSecondary: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.backgroundDeep,
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      minWidth: 112,
      justifyContent: "center",
    },
    buttonSecondaryText: {
      color: c.text,
      fontSize: 14,
      fontWeight: "600",
    },
    buttonPrimary: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.accent,
      paddingHorizontal: 18,
      paddingVertical: 11,
      borderRadius: 14,
      justifyContent: "center",
    },
    buttonPrimaryText: {
      color: "#ffffff",
      fontWeight: "bold",
      fontSize: 14,
    },
  }));

  const releaseYear = useMemo(
    () =>
      suggestedGame?.first_release_date
        ? new Date(suggestedGame.first_release_date * 1000).getFullYear()
        : null,
    [suggestedGame?.first_release_date],
  );

  const rating = suggestedGame?.total_rating
    ? (suggestedGame.total_rating / 10).toFixed(1)
    : null;

  const handleRandomGame = async (): Promise<void> => {
    if (randomLoading) return;
    setRandomLoading(true);
    try {
      const game = await fetchRandomGame();
      if (!game) throw new Error("No game available");
      setSuggestedGame(game);
      setShowSuggestion(true);
    } catch {
      Alert.alert(t("common.error"), t("games.random.error"));
    } finally {
      setRandomLoading(false);
    }
  };

  const handleViewSuggestedGame = (): void => {
    if (!suggestedGame) return;
    setShowSuggestion(false);
    navigation.navigate("GameDetails", { gameID: suggestedGame.id });
  };

  const closeSuggestion = (): void => setShowSuggestion(false);

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={handleRandomGame}
        disabled={randomLoading}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        accessibilityLabel={t("games.random.badge")}
      >
        {randomLoading ? (
          <ActivityIndicator size="small" color={colors.textMuted} />
        ) : (
          <Shuffle size={20} color={colors.textMuted} />
        )}
      </TouchableOpacity>

      <Modal
        visible={showSuggestion}
        transparent
        animationType="fade"
        onRequestClose={closeSuggestion}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={closeSuggestion}
        >
          <View style={styles.card}>
            {suggestedGame && (
              <>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeSuggestion}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={t("games.random.close")}
                >
                  <X size={18} color="#ffffff" />
                </TouchableOpacity>

                <View style={styles.coverWrapper}>
                  {suggestedGame.cover?.image_id ? (
                    <Image
                      source={{
                        uri: igdbImageUrl(suggestedGame.cover.image_id, "cover_big"),
                      }}
                      style={styles.cover}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : null}
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.85)"]}
                    style={styles.coverGradient}
                  />
                  <View style={styles.coverTitleWrapper}>
                    <CustomText style={styles.title} numberOfLines={2}>
                      {suggestedGame.name}
                    </CustomText>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  {rating ? (
                    <View style={styles.chip}>
                      <Star size={13} color={colors.accentText} />
                      <CustomText style={styles.chipText}>{rating}</CustomText>
                    </View>
                  ) : null}
                  {releaseYear ? (
                    <View style={styles.chip}>
                      <CalendarDays size={13} color={colors.textMuted} />
                      <CustomText style={styles.chipText}>{releaseYear}</CustomText>
                    </View>
                  ) : null}
                  {suggestedGame.genres?.slice(0, 2).map((genre) => (
                    <View key={genre.name} style={styles.chip}>
                      <CustomText style={styles.chipText}>
                        {genre.name}
                      </CustomText>
                    </View>
                  ))}
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.buttonSecondary}
                    onPress={handleRandomGame}
                    disabled={randomLoading}
                  >
                    {randomLoading ? (
                      <ActivityIndicator size="small" color={colors.textMuted} />
                    ) : (
                      <>
                        <Shuffle size={15} color={colors.text} />
                        <CustomText style={styles.buttonSecondaryText}>
                          {t("games.random.another")}
                        </CustomText>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.buttonPrimary}
                    onPress={handleViewSuggestedGame}
                    disabled={randomLoading}
                  >
                    <CustomText style={styles.buttonPrimaryText}>
                      {t("games.random.view")}
                    </CustomText>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default RandomGameButton;
