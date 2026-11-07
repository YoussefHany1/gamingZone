import React from "react";
import { View } from "react-native";
import SkeletonItem from "@/src/components/SkeletonItem";
import { usePulseAnimation } from "@/src/components/skeleton/shared";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

/**
 * UserProfileScreen skeleton: the hero card (banner, 80px avatar, name/handle
 * lines, stats row), one links-card row and the wide action button bar.
 */
const SkeletonUserProfile = (): React.ReactElement => {
  const animatedStyle = usePulseAnimation();
  const styles = useThemeStyles((c) => ({
    content: { padding: 16 },
    heroWrap: {
      borderRadius: 22,
      marginBottom: 18,
      borderWidth: 1,
      padding: 12,
      borderColor: c.accentBorder,
      backgroundColor: c.surface,
    },
    banner: { height: 120, borderRadius: 16 },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      marginTop: -32,
    },
    name: { width: "55%", height: 14, borderRadius: 7, marginTop: 10 },
    handle: { width: "32%", height: 11, borderRadius: 6, marginTop: 8 },
    statRow: { flexDirection: "row", gap: 8, marginTop: 12 },
    stat: { flex: 1, padding: 10 },
    statValue: { width: 56, height: 14, borderRadius: 7 },
    statLabel: { width: "44%", height: 10, borderRadius: 5, marginTop: 7 },
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 13,
      marginBottom: 10,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    linkIcon: { width: 38, height: 38, borderRadius: 11 },
    linkLabel: { width: "46%", height: 11, borderRadius: 6 },
    actionButton: {
      marginTop: 20,
      borderRadius: 12,
      height: 48,
    },
  }));

  return (
    <View style={styles.content}>
      <View style={styles.heroWrap}>
        <SkeletonItem animatedStyle={animatedStyle} style={styles.banner} />
        <View>
          <SkeletonItem animatedStyle={animatedStyle} style={styles.avatar} />
        </View>
        <SkeletonItem animatedStyle={animatedStyle} style={styles.name} />
        <SkeletonItem animatedStyle={animatedStyle} style={styles.handle} />
        <View style={styles.statRow}>
          {Array.from({ length: 2 }, (_, index) => (
            <View key={index} style={styles.stat}>
              <SkeletonItem animatedStyle={animatedStyle} style={styles.statValue} />
              <SkeletonItem animatedStyle={animatedStyle} style={styles.statLabel} />
            </View>
          ))}
        </View>
      </View>

      {Array.from({ length: 2 }, (_, index) => (
        <View key={index} style={styles.linkRow}>
          <SkeletonItem animatedStyle={animatedStyle} style={styles.linkIcon} />
          <SkeletonItem animatedStyle={animatedStyle} style={styles.linkLabel} />
        </View>
      ))}

      <SkeletonItem animatedStyle={animatedStyle} style={styles.actionButton} />
    </View>
  );
};

export default React.memo(SkeletonUserProfile);
