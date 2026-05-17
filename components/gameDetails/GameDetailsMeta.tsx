import { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import COLORS from "../../constants/colors";
import type { AgeRatingInfo, Platform } from "./types";
import { getRatingColor } from "./utils";

interface Props {
  name: string;
  releaseDate?: string;
  platforms?: Platform[];
  totalRating?: number;
  totalRatingCount?: number;
  ageRating: AgeRatingInfo | null;
}

const GameDetailsMeta: React.FC<Props> = ({
  name,
  releaseDate,
  platforms,
  totalRating,
  totalRatingCount,
  ageRating,
}) => (
  <View style={{ direction: "ltr" }}>
    <Text style={styles.title}>{name}</Text>
    <Text style={styles.releaseDate}>{releaseDate}</Text>

    <View style={styles.contentHeader}>
      <View style={styles.platformContainer}>
        {platforms?.map((p) => (
          <Text key={p.id} style={styles.platform}>{p.abbreviation}</Text>
        ))}
      </View>
      <View style={{ alignItems: "center", flexDirection: "column" }}>
        {totalRating ? (
          <Text style={[styles.rating, { backgroundColor: getRatingColor(totalRating / 10) }]}>
            {Math.round(totalRating) / 10}
          </Text>
        ) : (
          <Text style={[styles.rating, { backgroundColor: COLORS.secondary }]}>N/A</Text>
        )}
        {(totalRatingCount ?? 0) > 0 && (
          <Text style={styles.ratingCount}>{totalRatingCount} user ratings</Text>
        )}
      </View>
    </View>

    {ageRating && (
      <View style={[styles.ageRatingBadge, { backgroundColor: ageRating.color }]}>
        <Text style={styles.ageRatingText}>{ageRating.label}</Text>
      </View>
    )}
  </View>
);

export default memo(GameDetailsMeta);

const styles = StyleSheet.create({
  title: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: "bold",
    direction: "ltr",
  },
  releaseDate: {
    color: "gray",
    letterSpacing: 2,
    direction: "ltr",
  },
  contentHeader: {
    flexDirection: "row",
    alignItems: "center",
    direction: "ltr",
  },
  platformContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    flex: 1,
  },
  platform: {
    color: COLORS.textLight,
    fontSize: 17,
    fontWeight: "500",
    backgroundColor: "rgb(81, 105,150, 0.3)",
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 14,
  },
  rating: {
    color: COLORS.textLight,
    textAlign: "center",
    borderRadius: 50,
    textAlignVertical: "center",
    width: 70,
    height: 70,
    fontSize: 34,
    fontWeight: "bold",
  },
  ratingCount: {
    color: "#9f9f9f",
    marginTop: 4,
  },
  ageRatingBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginRight: 22,
    marginTop: 5,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-end",
    minWidth: 45,
  },
  ageRatingText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
});
