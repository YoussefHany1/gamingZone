import React, { memo } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import auth from "@react-native-firebase/auth";
import { Search, Trophy, LogIn } from "lucide-react-native";
import { useGamification } from "@/src/features/gamification";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomText from "@/src/components/CustomText";

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
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const user = auth().currentUser;
  const { gamification } = useGamification(user?.uid ?? "");

  const styles = useThemeStyles(
    (c) => ({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      position: "absolute",
      top: insets.top + 8,
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
    loginButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.accent,
      borderRadius: 14,
      paddingVertical: 5,
      paddingHorizontal: 10,
    },
    loginText: {
      color: c.onAccent,
      fontSize: 12,
      fontWeight: "600",
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
    }),
    [insets.top],
  );

  const hour = new Date().getHours();
  const greetingKey =
    hour < 12
      ? "home.header.goodMorning"
      : hour < 18
        ? "home.header.goodAfternoon"
        : "home.header.goodEvening";
  const firstName = user?.displayName?.trim().split(/\s+/)[0];
  const isGuest = !user || user.isAnonymous;

  return (
    <View style={styles.row}>
      {/* <View style={styles.texts}>
        <CustomText style={styles.greeting}>{t(greetingKey)}</CustomText>
        <CustomText style={styles.name}>
          {firstName ?? t("home.header.gamer")}
        </CustomText>
      </View> */}

      {isGuest ? (
        <Pressable
          style={({ pressed }) => [styles.loginButton, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.navigate("Auth", { screen: "Login" })}
          android_ripple={{ color: "rgba(255,255,255,0.18)", borderless: false }}
          hitSlop={{ top: 11, bottom: 11, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel={t("common.authPrompt.signIn")}
        >
          <LogIn size={13} color={colors.onAccent} />
          <CustomText style={styles.loginText}>
            {t("common.authPrompt.signIn")}
          </CustomText>
        </Pressable>
      ) : gamification ? (
        <Pressable
          style={({ pressed }) => [styles.levelPill, pressed && { opacity: 0.7 }]}
          onPress={() =>
            navigation.getParent()?.navigate("Settings", {
              screen: "Achievements",
              initial: false,
            })
          }
          android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
          // Pill is ~25dp tall; the slop brings the touch area to ~47dp.
          hitSlop={{ top: 11, bottom: 11 }}
          accessibilityRole="button"
          accessibilityLabel={t("gamification.achievementsTitle")}
        >
          <Trophy size={13} color={colors.accentText} />
          <CustomText style={styles.levelText}>
            {t("home.header.level", { level: gamification.level })}
          </CustomText>
        </Pressable>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.searchButton, pressed && { opacity: 0.7 }]}
        onPress={() =>
          navigation.getParent()?.navigate("Games", {
            screen: "GamesScreen",
            params: { focusSearch: Date.now() },
          })
        }
        android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
        // 38dp visual + 5dp slop ≈ the 48dp Android minimum touch target.
        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        accessibilityRole="button"
        accessibilityLabel={t("home.header.search")}
      >
        <Search size={20} color={colors.text} />
      </Pressable>
    </View>
  );
}

export default memo(HomeHeader);
