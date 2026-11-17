import React, { memo, useMemo } from "react";
import { Pressable, Platform } from "react-native";
import AppImage from "@/src/components/AppImage";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { SettingsUserCardProps } from "./types";

/**
 * The tappable identity card at the top of the settings list. It owns the
 * avatar fallbacks so the screen only has to pass what the auth store holds.
 */
const SettingsUserCard = memo(
  ({
    displayName,
    photoURL,
    isGuest,
    isRtl,
    onPress,
  }: SettingsUserCardProps): React.ReactElement => {
    const colors = useThemeColors();
    const { t } = useTranslation();

    const styles = useThemeStyles((c) => ({
      userContainer: {
        marginVertical: 15,
        flexDirection: "row",
        alignItems: "center",
        padding: 15,
        paddingVertical: 20,
        backgroundColor: c.surface,
        borderRadius: 12,
      },
      avatar: {
        height: 50,
        width: 50,
        borderRadius: 25,
      },
      displayName: {
        color: c.text,
        fontSize: 20,
        fontWeight: "bold",
        marginLeft: 15,
        flex: 1,
      },
    }));

    const avatarSource = useMemo(() => {
      if (isGuest) return require("@/assets/anonymous.webp");
      return photoURL
        ? { uri: photoURL }
        : require("@/assets/default_profile.webp");
    }, [photoURL, isGuest]);

    const label = isGuest || !displayName ? t("auth.register.signUpButton") : displayName;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.userContainer,
          Platform.OS === "android" && pressed && { opacity: 0.85 },
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        android_ripple={{ color: "rgba(128,128,128,0.2)", borderless: false }}
      >
        <AppImage
          source={avatarSource}
          style={styles.avatar}
          contentFit="cover"
          transition={500}
          cachePolicy="memory-disk"
          allowDownscaling
        />
        <CustomText style={styles.displayName}>{label}</CustomText>
        {!isGuest &&
          (isRtl ? (
            <ChevronLeft size={24} color={colors.accentText} />
          ) : (
            <ChevronRight size={24} color={colors.accentText} />
          ))}
      </Pressable>
    );
  },
);

SettingsUserCard.displayName = "SettingsUserCard";
export default SettingsUserCard;
