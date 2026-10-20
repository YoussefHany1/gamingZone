import React, { memo } from "react";
import { View, TouchableOpacity } from "react-native";
import { Bookmark } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import SteamSyncButton from "@/src/components/SteamSyncButton";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { EmptyGamesListProps } from "../../types";

/**
 * Placeholder shown when a list has no games yet: a bookmark icon, a tailored
 * subtitle and (for the user's own default lists) the Steam sync + find-game
 * actions.
 */
const EmptyGamesList = memo<EmptyGamesListProps>(
  ({ listId, isSharedList, showSteamSync, onFindGame }) => {
    const { t } = useTranslation();
    const colors = useThemeColors();

    const styles = useThemeStyles((c) => ({
      emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 100,
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
        marginTop: 8,
        paddingHorizontal: 20,
      },
      emptyActionsContainer: {
        width: "100%",
        paddingHorizontal: 40,
        marginTop: 28,
        alignItems: "center",
        gap: 12,
      },
      steamSyncBtn: {
        borderRadius: 16,
        width: "100%",
      },
      findGameButton: {
        backgroundColor: c.accent,
        padding: 10,
        borderRadius: 16,
        width: "100%",
      },
      findGameText: {
        color: c.onAccent,
        fontSize: 18,
        fontWeight: "600",
        textAlign: "center",
      },
    }));

    const emptySubText =
      listId === "rated"
        ? (t("userLists.empty.ratedSub") ??
          "Rate and review the games you have played here.")
        : t("settings.userGames.emptySubText");

    return (
      <View style={styles.emptyContainer}>
        <Bookmark size={80} color={colors.accentText}/>
        <CustomText style={styles.emptyText}>
          {t("settings.userGames.emptyText")}
        </CustomText>
        <CustomText style={styles.emptySubText}>{emptySubText}</CustomText>
        {!isSharedList && (
          <View style={styles.emptyActionsContainer}>
            {showSteamSync && <SteamSyncButton style={styles.steamSyncBtn} />}
            <TouchableOpacity onPress={onFindGame} style={styles.findGameButton}>
              <CustomText style={styles.findGameText}>
                {t("settings.userGames.findButton")}
              </CustomText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  },
);
EmptyGamesList.displayName = "EmptyGamesList";

export default EmptyGamesList;
