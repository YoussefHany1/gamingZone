import React, { memo } from "react";
import { View, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Star } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { igdbImageUrl } from "@gaming-zone/utils";
import CustomText from "@/src/components/CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { SettingsStackParamList } from "@/src/navigation/AppNavigator";
import type { GameEntry } from "@/src/features/lists/types";
import type { RateCardProps } from "./types";

const coverSource = (entry: GameEntry) =>
  entry.cover_image_id
    ? {
        uri: igdbImageUrl(entry.cover_image_id, "cover_small"),
      }
    : require("@/assets/image-not-found.webp");

/** One of the user's highest-rated games, linked to its details screen. */
const RateCard = memo(({ entry }: RateCardProps): React.ReactElement => {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const styles = useThemeStyles((c) => ({
    card: {
      width: 110,
      marginRight: 12,
    },
    cover: {
      width: 110,
      height: 146,
      borderRadius: 10,
      backgroundColor: c.skeletonBase,
    },
    name: {
      color: c.text,
      fontSize: 12,
      fontWeight: "600",
      marginTop: 6,
      height: 30,
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 2,
      gap: 4,
    },
    rating: {
      color: "#ffc107",
      fontSize: 12,
      fontWeight: "700",
    },
  }));

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("GameDetails", { gameID: entry.id })}
      activeOpacity={0.75}
    >
      <Image
        style={styles.cover}
        source={coverSource(entry)}
        contentFit="cover"
        transition={250}
        cachePolicy="memory-disk"
        allowDownscaling
      />
      <CustomText style={styles.name} numberOfLines={2}>
        {entry.name}
      </CustomText>
      <View style={styles.ratingRow}>
        <Star size={12} color="#ffc107" fill="#ffc107" />
        <CustomText style={styles.rating}>{entry.rating}</CustomText>
      </View>
    </TouchableOpacity>
  );
});

RateCard.displayName = "RateCard";
export default RateCard;
