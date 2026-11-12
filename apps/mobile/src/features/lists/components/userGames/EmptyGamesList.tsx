import React, { memo } from "react";
import { View, TouchableOpacity } from "react-native";
import { Bookmark } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { EmptyGamesListProps } from "../../types";

/**
 * Placeholder shown when a list has no games yet: an optional call-to-action
 * card (e.g. the account-link nudge), a bookmark icon, a tailored subtitle and
 * the find-game action.
 */
const EmptyGamesList = memo<EmptyGamesListProps>(
  ({ listId, isSharedList, nudge, onFindGame }) => {
    const { t } = useTranslation();
    const colors = useThemeColors();
    const hasNudge = Boolean(nudge);

    const styles = useThemeStyles(
      (c) => ({
        emptyContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          // The nudge card already fills the top of the empty state, so pull
          // the illustration up to meet it instead of centering it on screen.
          paddingTop: hasNudge ? 24 : 100,
        },
        nudge: {
          width: "100%",
          marginTop: 22,
        },
        emptyText: {
          color: c.text,
          fontSize: 24,
          fontWeight: "bold",
          marginTop: 16,
        },
        emptySubText: {
          color: c.textSubtle,
          fontSize: 16,
          textAlign: "center",
          marginTop: 4,
          paddingHorizontal: 20,
        },
        emptyActionsContainer: {
          width: "100%",
          paddingHorizontal: 40,
          marginTop: 28,
          alignItems: "center",
          gap: 12,
        },
        findGameButton: {
          backgroundColor: c.accent,
          padding: 8,
          borderRadius: 16,
          width: "90%",
        },
        findGameText: {
          color: c.onAccent,
          fontSize: 18,
          fontWeight: "600",
          textAlign: "center",
        },
      }),
      [hasNudge],
    );

    const emptySubText =
      listId === "rated"
        ? (t("userLists.empty.ratedSub") ??
          "Rate and review the games you have played here.")
        : t("settings.userGames.emptySubText");

    return (
      <View style={styles.emptyContainer}>
        <Bookmark size={80} color={colors.accentText} />
        <CustomText style={styles.emptyText}>
          {t("settings.userGames.emptyText")}
        </CustomText>
        <CustomText style={styles.emptySubText}>{emptySubText}</CustomText>
        {!isSharedList && (
          <View style={styles.emptyActionsContainer}>
            <TouchableOpacity onPress={onFindGame} style={styles.findGameButton}>
              <CustomText style={styles.findGameText}>
                {t("settings.userGames.findButton")}
              </CustomText>
            </TouchableOpacity>
          </View>
        )}
        {nudge ? <View style={styles.nudge}>{nudge}</View> : null}
      </View>
    );
  },
);
EmptyGamesList.displayName = "EmptyGamesList";

export default EmptyGamesList;
