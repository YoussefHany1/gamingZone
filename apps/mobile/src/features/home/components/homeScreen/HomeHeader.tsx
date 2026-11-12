import React, { memo } from "react";
import { TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import auth from "@react-native-firebase/auth";
import { Search, Trophy } from "lucide-react-native";
import { useGamification } from "@/src/features/gamification";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import CustomText from "@/src/components/CustomText";
import type { HomeStackParamList } from "@/src/navigation/AppNavigator";

/**
 * Home header: a time-of-day greeting with the user's first name, their
 * level pill (hidden while the gamification stats are still loading or
 * unavailable, e.g. anonymous users — the shared user-stats cache means
 * this hook never issues a Firestore read of its own), and a search button
 * that jumps to the Games tab, where the search/filter header lives.
 *
 * The level pill opens the Achievements screen, which lives in the Settings
 * stack, so it navigates through the parent tab navigator.
 */
function HomeHeader(): React.ReactElement {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const colors = useThemeColors();
  const user = auth().currentUser;
  const { gamification } = useGamification(user?.uid ?? "");

  const styles = useThemeStyles((c) => ({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      position: "absolute",
      top: 28,
      zIndex: 1,
      width: "100%",
    },
    texts: {
      flex: 1,
    },
    greeting: {
      color: c.textSubtle,
      fontSize: 13,
    },
    name: {
      color: c.text,
      fontSize: 20,
      fontWeight: "700",
    },
    levelPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.accentSurface,
      borderRadius: 14,
      paddingVertical: 5,
      paddingHorizontal: 10,
    },
    levelText: {
      color: c.text,
      fontSize: 12,
      fontWeight: "600",
    },
    searchButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: c.accentSurface,
      alignItems: "center",
      justifyContent: "center",
    },
  }));

  const hour = new Date().getHours();
  const greetingKey =
    hour < 12
      ? "home.header.goodMorning"
      : hour < 18
        ? "home.header.goodAfternoon"
        : "home.header.goodEvening";
  const firstName = user?.displayName?.trim().split(/\s+/)[0];

  return (
    <View style={styles.row}>
      {/* <View style={styles.texts}>
        <CustomText style={styles.greeting}>{t(greetingKey)}</CustomText>
        <CustomText style={styles.name}>
          {firstName ?? t("home.header.gamer")}
        </CustomText>
      </View> */}

      {gamification ? (
        <TouchableOpacity
          style={styles.levelPill}
          onPress={() =>
            navigation.getParent()?.navigate("Settings", {
              screen: "Achievements",
              initial: false,
            })
          }
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t("gamification.achievementsTitle")}
        >
          <Trophy size={13} color={colors.accentText} />
          <CustomText style={styles.levelText}>
            {t("home.header.level", { level: gamification.level })}
          </CustomText>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.searchButton}
        onPress={() =>
          navigation.getParent()?.navigate("Games", {
            screen: "GamesScreen",
            params: { focusSearch: Date.now() },
          })
        }
        accessibilityRole="button"
        accessibilityLabel={t("home.header.search")}
      >
        <Search size={20} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

export default memo(HomeHeader);
