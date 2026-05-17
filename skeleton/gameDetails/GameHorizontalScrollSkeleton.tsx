import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import useShimmer from "./useShimmer";
import SkeletonBar from "./SkeletonBar";

interface Props {
  title: string; // passed by caller (already translated)
}

// Static title + shimmer game cards in a horizontal row
const GameHorizontalScrollSkeleton: React.FC<Props> = ({ title }) => {
  const shimmer = useShimmer();
  const S = (p: Parameters<typeof SkeletonBar>[0]) => <SkeletonBar shimmer={shimmer} {...p} />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} scrollEnabled={false}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.card}>
            <S w={120} h={160} r={8} />
            <S w="85%" h={12} r={4} style={{ marginTop: 8 }} />
            <S w="60%" h={12} r={4} style={{ marginTop: 4 }} />
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
