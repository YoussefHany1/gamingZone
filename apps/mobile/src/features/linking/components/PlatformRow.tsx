/**
 * PlatformRow — one linked-account row in the "choose" panel.
 *
 * Memoised so a snapshot update for one platform never re-renders the rows
 * of the other two.
 */
import React, { memo } from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { Link2, Link2Off } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import { SteamIcon, PlayStationIcon, XboxIcon } from "@/src/components/icons/StoreIcons";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
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
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.7}
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
        <TouchableOpacity onPress={onRelink} style={styles.iconBtn}>
          <Link2 size={20} color={colors.textSubtle} />
        </TouchableOpacity>
      )}
      {onUnlink && !busy && (
        <TouchableOpacity onPress={onUnlink} style={styles.iconBtn}>
          <Link2Off size={20} color={colors.danger} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

PlatformRow.displayName = "PlatformRow";

export default memo(PlatformRow);
