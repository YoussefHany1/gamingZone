import { useCallback, memo } from "react";
import { Text, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import Swiper from "react-native-swiper";
import { LinearGradient } from "expo-linear-gradient";
import useFeed, { Article as FeedArticle } from "../../hooks/useFeed";
import SkeletonSlideshow from "../../skeleton/SkeletonSlideshow";
import COLORS from "../../constants/colors";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Article } from "../types";

interface SlideshowProps {
  website?: string;
  category?: string;
}

function Slideshow({ website, category }: SlideshowProps): React.ReactElement {
  const { articles, loading, error } = useFeed(category, website);
  const navigation = useNavigation<any>();
  const { t } = useTranslation();

  const handlePressArticle = useCallback(
    (item: Article): void => {
      navigation.navigate("NewsDetails", { article: item });
    },
    [navigation],
  );

  if (loading) return <SkeletonSlideshow />;
  if (error) return <Text>{t("common.error")}</Text>;

  return (
    <Swiper
      showsButtons
      autoplay
      showsPagination={false}
      autoplayTimeout={5}
      style={styles.swiper}
      nextButton={<Text style={{ color: "#506996", fontSize: 70 }}>›</Text>}
      prevButton={<Text style={{ color: "#506996", fontSize: 70 }}>‹</Text>}
    >
      {articles.map((item: FeedArticle, index: number) => (
        <TouchableOpacity
          key={index}
          style={{ position: "relative", width: "100%" }}
          onPress={() => handlePressArticle(item as Article)}
          activeOpacity={0.8}
        >
          <Image
            style={styles.thumbnail}
            recyclingKey={String(item?.thumbnail)}
            source={
              item?.thumbnail
                ? item.thumbnail
                : require("../../assets/image-not-found.webp")
            }
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
            allowDownscaling={true}
          />
          <LinearGradient
            colors={["transparent", COLORS.primary]}
            style={styles.gradient}
          />
          <Text style={styles.headline} numberOfLines={3}>
            {item.title}
          </Text>
        </TouchableOpacity>
      ))}
    </Swiper>
  );
}

export default memo(Slideshow);

const styles = StyleSheet.create({
  swiper: {
    height: 350,
    backgroundColor: COLORS.secondary,
  },
  thumbnail: {
    height: 350,
    resizeMode: "cover",
    width: "100%",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "120%",
  },
  headline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    fontSize: 20,
    textAlign: "center",
    fontWeight: "bold",
    color: "white",
    padding: 16,
  },
});