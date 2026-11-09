import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import CustomText from "@/src/components/CustomText";
import type {
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  StatusBar,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Images, X } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useFloatingTopInset } from "@/src/hooks/useBottomInset";
import Gallery from "react-native-better-awesome-gallery";

import { igdbImageUrl } from "@gaming-zone/utils";

import type {
  GalleryImage,
  ImageGalleryAdvancedProps,
} from "../../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Dots stop scaling well on large screenshot sets — fall back to the counter
// badge alone past this point.
const MAX_PAGINATION_DOTS = 8;

// ─── FullScreenImage ──────────────────────────────────────────────────────────
//
// Rendered inside the gallery's `renderItem`. Reports the loaded image
// dimensions back to the gallery (needed for correct aspect fit and pan
// bounds) and shows a spinner while the full-resolution image streams in.
// The spinner stays white: the fullscreen viewer has a fixed black
// background in both themes.

interface FullScreenImageProps {
  url: string;
  setImageDimensions: (dimensions: { width: number; height: number }) => void;
}

const FullScreenImage: React.FC<FullScreenImageProps> = React.memo(
  ({ url, setImageDimensions }) => {
    const [loading, setLoading] = useState(true);

    return (
      <View style={StyleSheet.absoluteFill}>
        <Image
          style={StyleSheet.absoluteFill}
          source={url}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={200}
          onLoadStart={() => setLoading(true)}
          onLoad={(e) => {
            // width/height can arrive missing or 0 for some sources — never
            // hand bad dimensions to the gallery.
            const { width, height } = e.source;
            if (width && height) {
              setImageDimensions({ width, height });
            }
            setLoading(false);
          }}
          onError={() => setLoading(false)}
        />
        {loading && (
          <View style={fullScreenStyles.loaderOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        )}
      </View>
    );
  },
);
FullScreenImage.displayName = "FullScreenImage";

// ─── GalleryThumbnail ────────────────────────────────────────────────────────

interface GalleryThumbnailProps {
  image: GalleryImage;
  index: number;
  totalImages: number;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
  isRtl: boolean;
  styles: any;
}

const GalleryThumbnail: React.FC<GalleryThumbnailProps> = React.memo(
  ({ image, index, totalImages, onPress, colors, isRtl, styles }) => {
    const [loading, setLoading] = useState(true);
    const { t } = useTranslation();

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={styles.thumbnailContainer}
        accessibilityLabel={t("games.details.gallery.imageOf", {
          current: index + 1,
          total: totalImages,
        })}
        accessibilityRole="imagebutton"
        accessibilityHint={t("games.details.gallery.viewFullScreen")}
      >
        <Image
          style={styles.thumbnail}
          source={image.thumbnail}
          contentFit="cover"
          cachePolicy="memory-disk"
          onLoadStart={() => setLoading(true)}
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
        />
        {loading && (
          <View style={styles.thumbnailLoaderOverlay} pointerEvents="none">
            <ActivityIndicator size="small" color={colors.accentText} />
          </View>
        )}
        {/* Side-gradient overlay — direction mirrors app locale */}
        <View
          style={[
            styles.gradientOverlay,
            { flexDirection: isRtl ? "row-reverse" : "row" },
          ]}
        >
          <LinearGradient
            colors={["transparent", colors.background]}
            style={styles.gradient}
            start={{ x: 1, y: 0.5 }}
            end={{ x: 0, y: 0.5 }}
          />
          <LinearGradient
            colors={[colors.background, "transparent"]}
            style={styles.gradient}
            start={{ x: 1, y: 0.5 }}
            end={{ x: 0, y: 0.5 }}
          />
        </View>
      </TouchableOpacity>
    );
  },
);
GalleryThumbnail.displayName = "GalleryThumbnail";

// ─── ImageGalleryAdvanced ─────────────────────────────────────────────────────

const ImageGalleryAdvanced: React.FC<ImageGalleryAdvancedProps> = ({
  coverImageId,
  screenshots = [],
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);
  const [chromeVisible, setChromeVisible] = useState(true);
  const chromeOpacity = useRef(new Animated.Value(1)).current;
  const colors = useThemeColors();
  const topInset = useFloatingTopInset(38);

  const styles = useThemeStyles(
    (c) => ({
    container: { width: "100%", height: 350, position: "relative" },
    scrollView: { width: "100%", height: "100%" },
    placeholder: {
      width: "100%",
      height: 350,
      backgroundColor: c.skeletonBase,
    },
    thumbnailContainer: {
      width: SCREEN_WIDTH,
      height: 350,
      position: "relative",
    },
    thumbnail: {
      width: "100%",
      height: "100%",
      backgroundColor: c.skeletonBase,
    },
    thumbnailLoaderOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1,
    },
    gradientOverlay: {
      justifyContent: "space-between",
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
    gradient: { height: "100%", width: "50%" },
    pagination: {
      flexDirection: "row",
      position: "absolute",
      bottom: 7,
      alignSelf: "center",
      backgroundColor: c.overlay,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 50,
      zIndex: 10,
    },
    paginationDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "rgba(255, 255, 255, 0.4)",
      marginHorizontal: 4,
    },
    paginationDotActive: { backgroundColor: "#ffffff", width: 20 },
    counter: {
      position: "absolute",
      top: topInset,
      right: 20,
      backgroundColor: c.overlay,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      zIndex: 10,
    },
    counterBadge: {
      backgroundColor: c.accent,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    counterText: { color: "#ffffff", fontSize: 12, fontWeight: "bold" },
    fullScreenCounter: {
      backgroundColor: c.overlay,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    fullScreenCounterText: { color: "#ffffff", fontSize: 16, fontWeight: "bold" },
    }),
    [topInset],
  );

  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  // Merge cover and screenshots into a single list — memoised to avoid
  // rebuilding the array on every render.
  const allImages = useMemo<GalleryImage[]>(() => {
    const images: GalleryImage[] = [];

    if (coverImageId) {
      images.push({
        id: "cover",
        url: igdbImageUrl(coverImageId, "1080p"),
        thumbnail: igdbImageUrl(coverImageId, "screenshot_med"),
      });
    }

    for (const shot of screenshots) {
      images.push({
        id: shot.id ?? shot.image_id,
        url: igdbImageUrl(shot.image_id, "1080p"),
        thumbnail: igdbImageUrl(shot.image_id, "screenshot_med"),
      });
    }

    return images;
  }, [coverImageId, screenshots]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
      // In RTL layouts (Android) contentOffset.x runs negative — Math.abs
      // keeps the index correct for both scroll directions.
      const index = Math.abs(
        Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH),
      );
      setActiveIndex(Math.min(index, allImages.length - 1));
    },
    [allImages.length],
  );

  const openFullScreen = useCallback(
    (index: number): void => {
      setFullScreenIndex(index);
      setChromeVisible(true);
      chromeOpacity.setValue(1);
      setFullScreenVisible(true);
    },
    [chromeOpacity],
  );

  const closeFullScreen = useCallback((): void => {
    setFullScreenVisible(false);
  }, []);

  // Tap on the image toggles the top controls — the polish native photo
  // viewers have.
  const toggleChrome = useCallback((): void => {
    setChromeVisible((prev) => {
      const next = !prev;
      Animated.timing(chromeOpacity, {
        toValue: next ? 1 : 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
      return next;
    });
  }, [chromeOpacity]);

  // Preload the full-resolution neighbours so swiping doesn't wait on the
  // network.
  useEffect(() => {
    if (!fullScreenVisible) return;
    const neighbours = [
      allImages[fullScreenIndex + 1]?.url,
      allImages[fullScreenIndex - 1]?.url,
    ];
    for (const url of neighbours) {
      if (url) {
        Image.prefetch(url).catch(() => {});
      }
    }
  }, [fullScreenVisible, fullScreenIndex, allImages]);

  const renderFullScreenItem = useCallback(
    ({
      item,
      setImageDimensions,
    }: {
      item: GalleryImage;
      index: number;
      setImageDimensions: (dimensions: { width: number; height: number }) => void;
    }): React.ReactElement => (
      <FullScreenImage url={item.url} setImageDimensions={setImageDimensions} />
    ),
    [],
  );

  if (allImages.length === 0) {
    return <View style={styles.placeholder} />;
  }

  const imageCount = allImages.length;

  return (
    <View style={styles.container}>
      {/* ── Horizontal paging thumbnail strip ─────────────────────────── */}
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {allImages.map((image, index) => (
          <GalleryThumbnail
            key={image.id}
            image={image}
            index={index}
            totalImages={allImages.length}
            onPress={() => openFullScreen(index)}
            colors={colors}
            isRtl={isRtl}
            styles={styles}
          />
        ))}
      </Animated.ScrollView>

      {/* ── Dot pagination ─────────────────────────────────────────────── */}
      {imageCount > 1 && imageCount <= MAX_PAGINATION_DOTS && (
        <View style={styles.pagination}>
          {allImages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === activeIndex && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      )}

      {/* ── Image counter badge ────────────────────────────────────────── */}
      {imageCount > 1 && (
        <View style={styles.counter}>
          <Images size={16} color={colors.text} />
          <View style={styles.counterBadge}>
            <CustomText style={styles.counterText}>
              {activeIndex + 1}/{imageCount}
            </CustomText>
          </View>
        </View>
      )}

      {/* ── Full-screen viewer modal ───────────────────────────────────── */}
      <Modal
        visible={fullScreenVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={closeFullScreen}
      >
        <StatusBar hidden />
        {/* Android modals render into a separate native window and need
            their own gesture root, or every gesture inside is dead. */}
        <GestureHandlerRootView style={fullScreenStyles.rootView}>
          <View style={fullScreenStyles.fullScreenContainer}>
            {/* Mounted only while open — a fresh Gallery instance picks up
                `initialIndex` on every open. */}
            {fullScreenVisible && (
              <Gallery
                data={allImages}
                keyExtractor={(item) => item.id}
                initialIndex={fullScreenIndex}
                onIndexChange={setFullScreenIndex}
                onSwipeToClose={closeFullScreen}
                onTap={toggleChrome}
                disableTransitionOnScaledImage
                hideAdjacentImagesOnScaledImage
                renderItem={renderFullScreenItem}
                style={fullScreenStyles.gallery}
              />
            )}

            {/* Top controls — fade out when the image is tapped */}
            <Animated.View
              pointerEvents={chromeVisible ? "auto" : "none"}
              style={[
                fullScreenStyles.topControls,
                {
                  top: (StatusBar.currentHeight ?? 40) + 10,
                  opacity: chromeOpacity,
                },
              ]}
            >
              <TouchableOpacity
                style={fullScreenStyles.closeButton}
                onPress={closeFullScreen}
                accessibilityLabel={t("games.details.gallery.close")}
                accessibilityRole="button"
              >
                <X size={28} color={colors.text} />
              </TouchableOpacity>
              <View style={styles.fullScreenCounter}>
                <CustomText style={styles.fullScreenCounterText}>
                  {fullScreenIndex + 1} / {imageCount}
                </CustomText>
              </View>
            </Animated.View>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
};

export default ImageGalleryAdvanced;

// ─── Styles ───────────────────────────────────────────────────────────────────
// Fullscreen geometry: no palette dependency, so it stays static. The only
// token applied at render time is the status-bar inset for `topControls`.
const fullScreenStyles = StyleSheet.create({
  rootView: { flex: 1 },
  fullScreenContainer: { flex: 1, backgroundColor: "#000000" },
  gallery: { flex: 1 },
  loaderOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  topControls: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 1000,
  },
  closeButton: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 25,
    padding: 10,
  },
});
