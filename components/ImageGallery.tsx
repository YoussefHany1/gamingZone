import React, { useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  StatusBar,
  Animated,
  Text,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  GestureHandlerRootView,
  PinchGestureHandler,
  PanGestureHandler,
  State,
  PinchGestureHandlerGestureEvent,
  PanGestureHandlerGestureEvent,
  HandlerStateChangeEvent,
  PinchGestureHandlerEventPayload,
  PanGestureHandlerEventPayload,
} from "react-native-gesture-handler";
import COLORS from "../constants/colors";
import { useTranslation } from "react-i18next";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const MIN_SCALE = 1;
const MAX_SCALE = 4;
// Swipe thresholds
const SWIPE_DOWN_DIST = 100;   // px downward to close
const SWIPE_DOWN_VEL = 800;   // px/s downward velocity to close
const SWIPE_HORIZ_DIST = 60;   // px horizontal to navigate
const SWIPE_HORIZ_VEL = 400;  // px/s horizontal velocity to navigate

// Domain types

interface GalleryImage {
  id: string;
  url: string;
  thumbnail: string;
}

interface Screenshot {
  id?: string;
  image_id: string;
}

// ZoomableImage
// — Pinch-to-zoom and pan when zoomed in.
// — When at normal scale (1×), horizontal swipe → navigate images,
//   downward swipe → close gallery.

interface ZoomableImageProps {
  imageUrl: string;
  onSwipeLeft?: () => void; // navigate forward
  onSwipeRight?: () => void; // navigate backward
  onSwipeDown?: () => void; // close gallery
}

const ZoomableImage: React.FC<ZoomableImageProps> = ({
  imageUrl,
  onSwipeLeft,
  onSwipeRight,
  onSwipeDown,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastScale = useRef<number>(1);
  const lastTranslateX = useRef<number>(0);
  const lastTranslateY = useRef<number>(0);
  const pinchScaleAnim = useRef(new Animated.Value(1)).current;

  const resetPan = (): void => {
    translateX.setValue(0);
    translateY.setValue(0);
    translateX.setOffset(0);
    translateY.setOffset(0);
    lastTranslateX.current = 0;
    lastTranslateY.current = 0;
  };

  const snapBack = (): void => {
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
    translateX.setOffset(0);
    translateY.setOffset(0);
    lastTranslateX.current = 0;
    lastTranslateY.current = 0;
  };

  const onPinchEvent: (e: PinchGestureHandlerGestureEvent) => void =
    Animated.event([{ nativeEvent: { scale: pinchScaleAnim } }], {
      useNativeDriver: true,
    });

  const onPinchStateChange = (
    event: HandlerStateChangeEvent<PinchGestureHandlerEventPayload>,
  ): void => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastScale.current *= event.nativeEvent.scale;
      if (lastScale.current > MAX_SCALE) lastScale.current = MAX_SCALE;
      if (lastScale.current < MIN_SCALE) {
        lastScale.current = MIN_SCALE;
        resetPan();
      }
      scale.setValue(lastScale.current);
      pinchScaleAnim.setValue(1);
    }
  };

  const onPanEvent: (e: PanGestureHandlerGestureEvent) => void =
    Animated.event(
      [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
      { useNativeDriver: true },
    );

  const onPanStateChange = (
    event: HandlerStateChangeEvent<PanGestureHandlerEventPayload>,
  ): void => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX: tx, translationY: ty, velocityX: vx, velocityY: vy } =
        event.nativeEvent;

      if (lastScale.current <= MIN_SCALE) {
        // ── Not zoomed: interpret as navigation / close gesture ──────────────
        const absX = Math.abs(tx);
        const absY = Math.abs(ty);

        // Swipe down → close
        if (ty > SWIPE_DOWN_DIST || vy > SWIPE_DOWN_VEL) {
          resetPan();
          onSwipeDown?.();
          return;
        }

        // Horizontal swipe → navigate (must be more horizontal than vertical)
        if (absX > absY && (absX > SWIPE_HORIZ_DIST || Math.abs(vx) > SWIPE_HORIZ_VEL)) {
          resetPan();
          if (tx < 0) onSwipeLeft?.();
          else onSwipeRight?.();
          return;
        }

        // Not a decisive gesture → spring back
        snapBack();
        return;
      }

      // ── Zoomed: accumulate pan offsets ─────────────────────────────────────
      lastTranslateX.current += tx;
      lastTranslateY.current += ty;
      translateX.setOffset(lastTranslateX.current);
      translateX.setValue(0);
      translateY.setOffset(lastTranslateY.current);
      translateY.setValue(0);
    }
  };

  const handleDoubleTap = (): void => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
    lastScale.current = 1;
    resetPan();
  };

  return (
    <PanGestureHandler
      onGestureEvent={onPanEvent}
      onHandlerStateChange={onPanStateChange}
      minPointers={1}
      maxPointers={1}
    >
      <Animated.View style={styles.zoomContainer}>
        <PinchGestureHandler
          onGestureEvent={onPinchEvent}
          onHandlerStateChange={onPinchStateChange}
        >
          <Animated.View style={{ flex: 1 }}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleDoubleTap}
              style={styles.imageWrapper}
            >
              <Animated.View
                style={[
                  styles.animatedImageContainer,
                  {
                    transform: [
                      { scale: Animated.multiply(scale, pinchScaleAnim) },
                      { translateX },
                      { translateY },
                    ],
                  },
                ]}
              >
                <Image
                  style={styles.fullScreenImage}
                  source={imageUrl}
                  contentFit="contain"
                  transition={300}
                  cachePolicy="memory-disk"
                />
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        </PinchGestureHandler>
      </Animated.View>
    </PanGestureHandler>
  );
};

// main

interface ImageGalleryAdvancedProps {
  coverImageId?: string;
  screenshots?: Screenshot[];
}

const ImageGalleryAdvanced: React.FC<ImageGalleryAdvancedProps> = ({
  coverImageId,
  screenshots = [],
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [fullScreenVisible, setFullScreenVisible] = useState<boolean>(false);
  const [fullScreenIndex, setFullScreenIndex] = useState<number>(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  // Merge cover image and screenshots into a unified list
  const allImages: GalleryImage[] = [
    coverImageId
      ? {
        id: "cover",
        url: `https://images.igdb.com/igdb/image/upload/t_1080p/${coverImageId}.webp`,
        thumbnail: `https://images.igdb.com/igdb/image/upload/t_cover_big/${coverImageId}.webp`,
      }
      : null,
    ...screenshots.map((screenshot) => ({
      id: screenshot.id ?? screenshot.image_id,
      url: `https://images.igdb.com/igdb/image/upload/t_1080p/${screenshot.image_id}.webp`,
      thumbnail: `https://images.igdb.com/igdb/image/upload/t_screenshot_med/${screenshot.image_id}.webp`,
    })),
  ].filter(Boolean) as GalleryImage[];

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  const openFullScreen = (index: number): void => {
    setFullScreenIndex(index);
    setFullScreenVisible(true);
  };

  const closeFullScreen = useCallback((): void => {
    setFullScreenVisible(false);
  }, []);

  const goToNextImage = useCallback((): void => {
    setFullScreenIndex((prev) => Math.min(prev + 1, allImages.length - 1));
  }, [allImages.length]);

  const goToPreviousImage = useCallback((): void => {
    setFullScreenIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  if (allImages.length === 0) {
    return <View style={styles.placeholderImage} />;
  }

  const isFirst = fullScreenIndex === 0;
  const isLast = fullScreenIndex === allImages.length - 1;

  return (
    <View style={styles.container}>
      {/* Horizontal paging gallery */}
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {allImages.map((image, index) => (
          <TouchableOpacity
            key={image.id}
            activeOpacity={0.9}
            onPress={() => openFullScreen(index)}
            style={styles.imageContainer}
          >
            <Image
              style={styles.image}
              source={image.thumbnail}
              contentFit="cover"
              cachePolicy="memory-disk"
              placeholder={require("../assets/image-not-found.webp")}
            />
            {/* Side-gradient overlay — direction mirrors app locale */}
            <View
              style={[
                styles.backgroundContainer,
                { flexDirection: currentLang === "en" ? "row" : "row-reverse" },
              ]}
            >
              <LinearGradient
                colors={["transparent", COLORS.primary]}
                style={styles.gradient}
                start={{ x: 1, y: 0.5 }}
                end={{ x: 0, y: 0.5 }}
              />
              <LinearGradient
                colors={[COLORS.primary, "transparent"]}
                style={styles.gradient}
                start={{ x: 1, y: 0.5 }}
                end={{ x: 0, y: 0.5 }}
              />
            </View>
          </TouchableOpacity>
        ))}
      </Animated.ScrollView>

      {/* Dot pagination indicator */}
      {allImages.length > 1 && (
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

      {/* Image counter badge */}
      {allImages.length > 1 && (
        <View style={styles.counter}>
          <Ionicons name="images-outline" size={16} color="#fff" />
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>
              {activeIndex + 1}/{allImages.length}
            </Text>
          </View>
        </View>
      )}

      {/* Full-screen viewer modal */}
      <Modal
        visible={fullScreenVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={closeFullScreen}
      >
        <StatusBar hidden />
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={styles.fullScreenContainer}>

            {/* Top controls: close button + counter */}
            <View style={styles.topControls}>
              <TouchableOpacity style={styles.controlButton} onPress={closeFullScreen}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <View style={styles.fullScreenCounterBadge}>
                <Text style={styles.fullScreenCounterText}>
                  {fullScreenIndex + 1} / {allImages.length}
                </Text>
              </View>
            </View>

            {/* Swipe hint indicators (prev / next arrows, fade when at edges) */}
            {allImages.length > 1 && (
              <View style={styles.swipeHints} pointerEvents="none">
                <Ionicons
                  name="chevron-back"
                  size={28}
                  color={isFirst ? "transparent" : "rgba(255,255,255,0.25)"}
                />
                <Ionicons
                  name="chevron-forward"
                  size={28}
                  color={isLast ? "transparent" : "rgba(255,255,255,0.25)"}
                />
              </View>
            )}

            {/* Pinch-to-zoom + swipe-navigable image */}
            <View style={styles.imageArea}>
              <ZoomableImage
                key={fullScreenIndex}
                imageUrl={allImages[fullScreenIndex].url}
                onSwipeLeft={!isLast ? goToNextImage : undefined}
                onSwipeRight={!isFirst ? goToPreviousImage : undefined}
                onSwipeDown={closeFullScreen}
              />
            </View>

          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
};

export default ImageGalleryAdvanced;

const styles = StyleSheet.create({
  container: { width: "100%", height: 350, position: "relative" },
  scrollView: { width: "100%", height: "100%" },
  imageContainer: { width: SCREEN_WIDTH, height: 350, position: "relative" },
  image: { width: "100%", height: "100%", backgroundColor: COLORS.secondary },
  placeholderImage: { width: "100%", height: 350, backgroundColor: COLORS.secondary },
  pagination: {
    flexDirection: "row",
    position: "absolute",
    bottom: 7,
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 28, 0.5)",
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
  paginationDotActive: { backgroundColor: COLORS.lightGray, width: 20 },
  counter: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(0, 0, 28, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    zIndex: 10,
  },
  counterBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  counterText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  fullScreenContainer: { flex: 1, backgroundColor: "#000" },
  topControls: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 1000,
  },
  controlButton: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 25,
    padding: 10,
  },
  fullScreenCounterBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  fullScreenCounterText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  imageArea: { flex: 1, justifyContent: "center", alignItems: "center" },
  // Subtle left/right chevrons to hint at swipe navigation
  swipeHints: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    zIndex: 999,
  },
  zoomContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  imageWrapper: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  animatedImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  backgroundContainer: {
    justifyContent: "space-between",
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  gradient: { height: "100%", width: "50%" },
});
