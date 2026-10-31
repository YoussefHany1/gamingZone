import React, { memo } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import GamerAvatar from "./GamerAvatar";
import PressScale from "./PressScale";

export type SocialListRowProps = {
  photoURL?: string | null | undefined;
  label: string;
  subtitle?: string | null;
  /** Extra muted line (conversation timestamp). */
  meta?: string | null;
  unreadCount?: number;
  /** Action buttons or status text rendered at the end of the row. */
  trailing?: React.ReactNode;
  selected?: boolean;
  /** Conversation subtitles use the snippet style instead of the muted one. */
  conversation?: boolean;
  onPress?: (() => void) | undefined;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * One row of the social lists: friends, incoming/sent requests, search hits,
 * conversations and group-create pickers all share this layout.
 */
const SocialListRow = memo(
  ({
    photoURL,
    label,
    subtitle,
    meta,
    unreadCount,
    trailing,
    selected = false,
    conversation = false,
    onPress,
    disabled = false,
    style,
  }: SocialListRowProps): React.ReactElement => {
    const styles = useThemeStyles((c) => ({
      row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 13,
        marginBottom: 10,
        borderRadius: 18,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
      },
      selected: { backgroundColor: c.accentSurface, borderColor: c.accentBorder },
      body: { flex: 1 },
      label: { color: c.text, fontSize: 15, fontWeight: "700" },
      muted: { color: c.textMuted, fontSize: 12, marginTop: 3 },
      snippet: { color: c.textMuted, fontSize: 13, marginTop: 4 },
      selectedText: { color: c.accentText },
      unreadBadge: {
        minWidth: 25,
        height: 22,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 7,
        backgroundColor: c.accent,
      },
      unreadText: { color: c.onAccent, fontSize: 11, fontWeight: "900" },
    }));

    return (
      <PressScale
        style={[styles.row, selected && styles.selected, style]}
        onPress={onPress}
        disabled={disabled}
      >
        <GamerAvatar photoURL={photoURL} size={44} />
        <View style={styles.body}>
          <CustomText
            style={[styles.label, selected && styles.selectedText]}
            numberOfLines={1}
          >
            {label}
          </CustomText>
          {subtitle ? (
            <CustomText
              style={[
                conversation ? styles.snippet : styles.muted,
                selected && styles.selectedText,
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </CustomText>
          ) : null}
          {meta ? (
            <CustomText style={[styles.muted, selected && styles.selectedText]}>
              {meta}
            </CustomText>
          ) : null}
        </View>
        {unreadCount ? (
          <View style={styles.unreadBadge}>
            <CustomText style={styles.unreadText}>{unreadCount}</CustomText>
          </View>
        ) : null}
        {trailing}
      </PressScale>
    );
  },
);

SocialListRow.displayName = "SocialListRow";
export default SocialListRow;
