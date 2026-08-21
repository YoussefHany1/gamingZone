import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import CustomText from "@/src/components/CustomText";
import useShimmer from "./useShimmer";
import SkeletonBar from "./SkeletonBar";

type SProps = Omit<Parameters<typeof SkeletonBar>[0], "shimmer">;

interface Props {
  /** Section title — passed by the caller (already translated). */
  title: string;
}

// Static title + shimmer game cards in a horizontal row
const GameHorizontalScrollSkeleton: React.FC<Props> = ({ title }) => {
  const shimmer = useShimmer();
  const S = (p: SProps) => <SkeletonBar shimmer={shimmer} {...p} />;

  return (
    <View style={styles.container}>
      <CustomText style={styles.header}>{title}</CustomText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 10 }}
        scrollEnabled={false}
      >
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.card}>
            <S width={120} height={160} radius={8} />
            <S width="85%" height={12} radius={4} style={{ marginTop: 8 }} />
            <S width="60%" height={12} radius={4} style={{ marginTop: 4 }} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default GameHorizontalScrollSkeleton;

const styles = StyleSheet.create({
  container: { marginTop: 20 },
  header: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginTop: 10,
  },
  card: {
    width: 120,
    marginRight: 12,
    alignItems: "center",
  },
});
