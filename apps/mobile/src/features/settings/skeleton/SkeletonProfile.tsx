import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { usePulseAnimation } from "@/src/components/skeleton/shared";
import SkeletonItem from "@/src/components/SkeletonItem";

/** Placeholder shown while the edit-profile form loads. */
const SkeletonProfile = memo((): React.ReactElement => {
  const animatedStyle = usePulseAnimation();

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarBlock}>
        <SkeletonItem animatedStyle={animatedStyle} style={styles.avatar} />
        <SkeletonItem animatedStyle={animatedStyle} style={styles.avatarCaption} />
      </View>

      {/* Name */}
      <SkeletonItem animatedStyle={animatedStyle} style={styles.label} />
      <SkeletonItem animatedStyle={animatedStyle} style={styles.input} />

      {/* DOB */}
      <SkeletonItem animatedStyle={animatedStyle} style={styles.label} />
      <SkeletonItem animatedStyle={animatedStyle} style={styles.input} />

      {/* Gender */}
      <SkeletonItem animatedStyle={animatedStyle} style={styles.label} />
      <SkeletonItem animatedStyle={animatedStyle} style={styles.input} />

      {/* Country */}
      <SkeletonItem animatedStyle={animatedStyle} style={styles.label} />
      <SkeletonItem animatedStyle={animatedStyle} style={styles.input} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { padding: 20 },
  avatarBlock: { alignItems: "center", marginBottom: 20 },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarCaption: { width: 100, height: 20, marginTop: 10, borderRadius: 4 },
  label: { width: 100, height: 18, borderRadius: 4, marginBottom: 10 },
  input: { width: "100%", height: 50, borderRadius: 5, marginBottom: 20 },
});

SkeletonProfile.displayName = "SkeletonProfile";
export default SkeletonProfile;
