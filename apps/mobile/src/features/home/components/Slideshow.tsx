import React, { useCallback, memo, useState, useRef, useEffect } from "react";
import CustomText from "@/src/components/CustomText";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Modal,
  Pressable,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import PagerView from "react-native-pager-view";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BannerAd, BannerAdSize } from "@/src/components/AdBanner";
import SkeletonSlideshow from "../skeleton/SkeletonSlideshow";
import ErrorState from "@/src/components/ErrorState";
import COLORS from "@/src/constants/colors";
import { adUnitId } from "@/src/constants/config";
import useCachedData from "@/src/hooks/useCachedData";
import { Game } from "@/src/types/sharedTypes";
import { igdbImageUrl } from "@gaming-zone/utils";
import YoutubePlayer from "react-native-youtube-iframe";
import { fetchLatestTrailers } from "@/src/services/api/igdbApi";

const STORAGE_KEY = "GAMES_CACHE_LATEST_TRAILERS";
const SLIDESHOW_HEIGHT = 300;
const AUTOPLAY_INTERVAL_MS = 5000;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

function getTrailerVideoId(item: Game): string | undefined {
  const video =
    item.videos?.find((v) => v.name?.toLowerCase().includes("trailer")) ??
    item.videos?.[0];
  return video?.video_id;
}

function getImageSource(item: Game): string | ReturnType<typeof require> {
  if (item.screenshots?.[0]?.image_id) {
    return igdbImageUrl(item.screenshots[0].image_id, "720p");
  }
  if (item.cover?.image_id) {
    return igdbImageUrl(item.cover.image_id, "cover_big");
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
    ? igdbImageUrl(item.cover.image_id, "cover_big")
    : null;

  return (
    <TouchableOpacity style={styles.slide} onPress={handlePress} activeOpacity={0.8}>
      <Image
        style={styles.thumbnail}
        recyclingKey={String(item.id)}
        source={getImageSource(item)}
        contentFit="cover"
        transition={300}
        cachePolicy="memory-disk"
        allowDownscaling
      />
      <LinearGradient colors={["transparent", COLORS.primary]} style={styles.gradient} />
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
          <CustomText style={styles.title} numberOfLines={2}>
            {item.name}
          </CustomText>
          <View style={styles.playRow}>
            <Ionicons
              name="play-circle-outline"
              size={18}
              color={COLORS.lightGray}
              style={{ marginRight: 6 }}
            />
            <CustomText style={styles.subtitle} numberOfLines={1}>
              {t("home.slideshow.subtitle")}
            </CustomText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});
Slide.displayName = "Slide";

// Pagination dots

interface PaginationProps {
  count: number;
  activeIndex: number;
}

const Pagination = memo<PaginationProps>(({ count, activeIndex }) => (
  <View style={styles.paginationContainer}>
    {Array.from({ length: count }, (_, i) => (
      <View
        key={i}
        style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
      />
    ))}
  </View>
));
Pagination.displayName = "Pagination";

// Slideshow

function Slideshow(): React.ReactElement {
  const { t } = useTranslation();
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  const activeIndexRef = useRef(0);

  const { data, isLoading, error } = useCachedData<Game[]>(
    STORAGE_KEY,
    fetchLatestTrailers,
    [],
  );

  const trailers = Array.isArray(data)
    ? data.filter((item) => !!getTrailerVideoId(item))
    : [];

  // Auto-play: advance to next page every 5 seconds
  useEffect(() => {
    if (trailers.length <= 1) return;

    const interval = setInterval(() => {
      const next = (activeIndexRef.current + 1) % trailers.length;
      pagerRef.current?.setPage(next);
    }, AUTOPLAY_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [trailers.length]);

  const handlePageSelected = useCallback((e: { nativeEvent: { position: number } }) => {
    const idx = e.nativeEvent.position;
    activeIndexRef.current = idx;
    setActiveIndex(idx);
  }, []);

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
      <View style={styles.swiperContainer}>
        <PagerView
          ref={pagerRef}
          style={styles.pager}
          initialPage={0}
          onPageSelected={handlePageSelected}
          overdrag
        >
          {trailers.map((item) => (
            <View key={String(item.id)}>
              <Slide item={item} onPress={handlePressTrailer} />
            </View>
          ))}
        </PagerView>

        <Pagination count={trailers.length} activeIndex={activeIndex} />
      </View>

      <Modal
        visible={!!playingVideoId}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseModal} />
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
  swiperContainer: {
    height: SLIDESHOW_HEIGHT,
    backgroundColor: COLORS.secondary,
    position: "relative",
  },
  pager: {
    flex: 1,
  },
  slide: {
    position: "relative",
    width: SCREEN_WIDTH,
  },
  thumbnail: {
    height: SLIDESHOW_HEIGHT,
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
    width: 75,
    height: 110,
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
    fontWeight: "200",
    fontSize: 14,
  },
  paginationContainer: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    borderRadius: 4,
    height: 6,
    backgroundColor: COLORS.secondary,
  },
  dotActive: {
    width: 18,
    backgroundColor: COLORS.lightGray,
  },
  dotInactive: {
    width: 6,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
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
