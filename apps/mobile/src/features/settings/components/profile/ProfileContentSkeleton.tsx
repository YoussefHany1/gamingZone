import React, { memo } from "react";
import { View } from "react-native";
import SkeletonItem from "@/src/components/SkeletonItem";
import { usePulseAnimation } from "@/src/components/skeleton/shared";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

/** Placeholder shown while the profile has no cached statistics yet. */
const ProfileContentSkeleton = memo((): React.ReactElement => {
  const pulse = usePulseAnimation();

  const styles = useThemeStyles(() => ({
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 24,
    },
    avatar: {
      width: 76,
      height: 76,
      borderRadius: 38,
    },
    name: {
      width: 160,
      height: 20,
      borderRadius: 6,
      marginBottom: 8,
    },
    meta: {
      width: 120,
      height: 14,
      borderRadius: 5,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
    },
    tile: {
      flex: 1,
      height: 88,
      borderRadius: 14,
      marginBottom: 10,
    },
    banner: {
      height: 170,
      borderRadius: 12,
      marginTop: 8,
    },
  }));

  return (
    <View>
      <View style={styles.header}>
        <SkeletonItem animatedStyle={pulse} style={styles.avatar} />
        <View>
          <SkeletonItem animatedStyle={pulse} style={styles.name} />
          <SkeletonItem animatedStyle={pulse} style={styles.meta} />
        </View>
      </View>
      {[0, 1].map((i) => (
        <View key={i} style={styles.row}>
          <SkeletonItem animatedStyle={pulse} style={styles.tile} />
          <SkeletonItem animatedStyle={pulse} style={styles.tile} />
        </View>
      ))}
      <SkeletonItem animatedStyle={pulse} style={styles.banner} />
    </View>
  );
});

ProfileContentSkeleton.displayName = "ProfileContentSkeleton";
export default ProfileContentSkeleton;
