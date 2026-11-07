import React from "react";
import { View } from "react-native";
import SkeletonItem from "@/src/components/SkeletonItem";
import { usePulseAnimation } from "@/src/components/skeleton/shared";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

/** How many placeholder rows to render while the list loads. */
const ROW_COUNT = 6;

/**
 * SocialListRow-shaped skeleton cards for the social lists' first load:
 * friend, request and conversation rows all share this layout
 * (44px avatar circle + label/subtitle lines inside the padded card).
 */
const SkeletonSocial = (): React.ReactElement => {
  const animatedStyle = usePulseAnimation();
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
    body: { flex: 1 },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    label: { width: "58%", height: 12, borderRadius: 6 },
    subtitle: { width: "38%", height: 10, borderRadius: 5, marginTop: 8 },
    meta: { width: 56, height: 10, borderRadius: 5 },
  }));

  return (
    <View>
      {Array.from({ length: ROW_COUNT }, (_, index) => (
        <View key={index} style={styles.row}>
          <SkeletonItem animatedStyle={animatedStyle} style={styles.avatar} />
          <View style={styles.body}>
            <SkeletonItem animatedStyle={animatedStyle} style={styles.label} />
            <SkeletonItem animatedStyle={animatedStyle} style={styles.subtitle} />
          </View>
          <SkeletonItem animatedStyle={animatedStyle} style={styles.meta} />
        </View>
      ))}
    </View>
  );
};

export default React.memo(SkeletonSocial);
