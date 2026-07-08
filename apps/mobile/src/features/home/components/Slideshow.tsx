import React, { useCallback, memo, useState } from "react";
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import Swiper from "react-native-swiper";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { useTranslation } from "react-i18next";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import SkeletonSlideshow from "../skeleton/SkeletonSlideshow";
import ErrorState from "@/src/components/ErrorState";
import COLORS from "@/src/constants/colors";
import { SERVER_URL, adUnitId } from "@/src/constants/config";
import useCachedData from "@/src/hooks/useCachedData";
import { Game } from "@/src/types/sharedTypes";
import YoutubePlayer from "react-native-youtube-iframe";

const STORAGE_KEY = "GAMES_CACHE_LATEST_TRAILERS";

const fetchLatestTrailers = async (): Promise<Game[]> => {
  const response = await axios.get<Game[]>(`${SERVER_URL}/latest-trailers`);
  return response.data;
};

function getTrailerVideoId(item: Game): string | undefined {
  const video =
    item.videos?.find((v) => v.name?.toLowerCase().includes("trailer")) ??
    item.videos?.[0];
  return video?.video_id;
}

function getImageSource(item: Game): string | ReturnType<typeof require> {
  if (item.screenshots?.[0]?.image_id) {
    return `https://images.igdb.com/igdb/image/upload/t_1080p/${item.screenshots[0].image_id}.webp`;
  }
  if (item.cover?.image_id) {
    return `https://images.igdb.com/igdb/image/upload/t_cover_big/${item.cover.image_id}.webp`;
  }
  return require("@/assets/image-not-found.webp");
}

// Slide

interface SlideProps {
  item: Game;
  onPress: (item: Game) => void;
}

const Slide = memo<SlideProps>(({ item, onPress }) => {
  const { t } = useTranslation();
  const handlePress = useCallback(() => onPress(item), [onPress, item]);

  const coverUrl = item.cover?.image_id
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${item.cover.image_id}.webp`
    : null;

  return (
    <TouchableOpacity
      style={styles.slide}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Image
        style={styles.thumbnail}
        recyclingKey={String(item.id)}
        source={getImageSource(item)}
        contentFit="cover"
        transition={300}
        cachePolicy="memory-disk"
        allowDownscaling
      />
      <LinearGradient
        colors={["transparent", COLORS.primary]}
        style={styles.gradient}
      />
      <View style={styles.headline}>
        {coverUrl && (
          <Image
            source={{ uri: coverUrl }}
            style={styles.coverImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            allowDownscaling
          />
        )}
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.playRow}>
            <Ionicons
              name="play-circle-outline"
              size={18}
              color="#779bdd"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.subtitle} numberOfLines={1}>
              {t("home.slideshow.subtitle")}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});
Slide.displayName = "Slide";

// Slideshow

function Slideshow(): React.ReactElement {
  const { t } = useTranslation();
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const { data, isLoading, error } = useCachedData<Game[]>(
    STORAGE_KEY,
    fetchLatestTrailers,
    [],
  );

  const trailers = Array.isArray(data)
    ? data.filter((item) => !!getTrailerVideoId(item))
    : [];

  const handlePressTrailer = useCallback((item: Game): void => {
    const videoId = getTrailerVideoId(item);
    if (videoId) setPlayingVideoId(videoId);
  }, []);

  const handleCloseModal = useCallback(() => setPlayingVideoId(null), []);

  if (isLoading) return <SkeletonSlideshow />;

  if (error || trailers.length === 0) {
    return (
      <View style={styles.errorWrapper}>
        <ErrorState message={t("home.slideshow.error")} />
      </View>
    );
  }

  return (
    <>
      <Swiper
        showsButtons
        autoplay
        showsPagination={false}
        autoplayTimeout={5}
        style={styles.swiper}
        nextButton={
          <Text style={styles.swiperBtn}>
            {/* <Ionicons name="chevron-back" size={48} color={COLORS.lightGray} /> */}
          </Text>
        }
        prevButton={
          <Text style={styles.swiperBtn}>
            {/* <Ionicons
              name="chevron-forward"
              size={48}
              color={COLORS.lightGray}
            /> */}
          </Text>
        }
      >
        {trailers.map((item) => (
          <Slide
            key={String(item.id)}
            item={item}
            onPress={handlePressTrailer}
          />
        ))}
      </Swiper>

      <Modal
        visible={!!playingVideoId}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleCloseModal}
          />
          <View style={styles.modalContent}>
            <View style={styles.videoContainer}>
              {/* Modal is only shown when playingVideoId is non-null, so the
                  non-null assertion here is safe and avoids the empty-string fallback. */}
              <YoutubePlayer height={250} play videoId={playingVideoId!} />
            </View>
            <BannerAd unitId={adUnitId} size={BannerAdSize.MEDIUM_RECTANGLE} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const SlideshowMemo = memo(Slideshow);
SlideshowMemo.displayName = "Slideshow";
export default SlideshowMemo;

// Styles

const styles = StyleSheet.create({
  swiper: {
    height: 300,
    backgroundColor: COLORS.secondary,
  },
  swiperBtn: {
    color: "#506996",
    fontSize: 70,
  },
  slide: {
    position: "relative",
    width: "100%",
  },
  thumbnail: {
    height: 300,
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
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  coverImage: {
    width: 65,
    height: 90,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  playRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  subtitle: {
    color: "#779bdd",
    fontWeight: "600",
    fontSize: 14,
  },
  errorWrapper: {
    height: 350,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "100%",
    alignItems: "center",
  },
  videoContainer: {
    width: "100%",
    backgroundColor: "black",
    marginBottom: 20,
  },
});
