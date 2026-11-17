/**
 * PlatformRow — one linked-account row in the "choose" panel.
 *
 * Memoised so a snapshot update for one platform never re-renders the rows
 * of the other two.
 */
import React, { memo } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Link2, Link2Off } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import { SteamIcon, PlayStationIcon, XboxIcon } from "@/src/components/icons/StoreIcons";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useTranslation } from "react-i18next";
import type { LinkedAccountPlatform } from "@/src/features/settings/types";

const PLATFORM_ICONS: Record<
  LinkedAccountPlatform,
  React.FC<{ size?: number; fill?: string }>
> = {
  steam: SteamIcon,
  psn: PlayStationIcon,
  xbox: XboxIcon,
};

export type PlatformRowProps = {
  platform: LinkedAccountPlatform;
  /** The display name (the gamertag / online id once the account is linked). */
  name: string;
  /** The secondary line: "not connected" / "last synced: …" / reconnect hint. */
  meta: string;
  busy: boolean;
  onPress: () => void;
  onRelink?: (() => void) | undefined;
  onUnlink?: (() => void) | undefined;
};

function PlatformRow({
  platform,
  name,
  meta,
  busy,
  onPress,
  onRelink,
  onUnlink,
}: PlatformRowProps): React.ReactElement {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const styles = useThemeStyles((c) => ({
    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    rowSpinner: { marginRight: 6, marginLeft: 4 },
    rowIcon: { marginRight: 10 },
    rowTextWrap: { flex: 1 },
    rowName: { color: c.text, fontSize: 15, fontWeight: "600" },
    rowHint: { color: c.textSubtle, fontSize: 12 },
    iconBtn: { padding: 8, marginLeft: 2 },
  }));

  const Icon = PLATFORM_ICONS[platform];

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      android_ripple={{ color: "rgba(128,128,128,0.25)", borderless: false }}
    >
      <View style={styles.rowIcon}>
        <Icon size={26} fill={colors.text} />
      </View>
      <View style={styles.rowTextWrap}>
        <CustomText style={styles.rowName}>{name}</CustomText>
        <CustomText style={styles.rowHint} numberOfLines={1}>
          {meta}
        </CustomText>
      </View>
      {busy && (
        <ActivityIndicator size="small" color={colors.textSubtle} style={styles.rowSpinner} />
      )}
      {onRelink && !busy && (
        <Pressable
          onPress={onRelink}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.85 }]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={t("settings.linkedAccounts.relink", { defaultValue: "Relink" })}
          android_ripple={{
            color: "rgba(128,128,128,0.25)",
            borderless: true,
            radius: 18,
          }}
        >
          <Link2 size={20} color={colors.textSubtle} />
        </Pressable>
      )}
      {onUnlink && !busy && (
        <Pressable
          onPress={onUnlink}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.85 }]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={t("settings.linkedAccounts.unlink", { defaultValue: "Unlink" })}
          android_ripple={{
            color: "rgba(128,128,128,0.25)",
            borderless: true,
            radius: 18,
          }}
        >
          <Link2Off size={20} color={colors.danger} />
        </Pressable>
      )}
    </Pressable>
  );
}

PlatformRow.displayName = "PlatformRow";

export default memo(PlatformRow);
