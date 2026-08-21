import React, { useState, useRef, useCallback, useMemo } from "react";
import CustomText from "@/src/components/CustomText";
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  StatusBar,
  Animated,
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
import { useTranslation } from "react-i18next";
import COLORS from "@/src/constants/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Gesture thresholds ───────────────────────────────────────────────────────

const MIN_SCALE = 1;
const MAX_SCALE = 4;

const SWIPE_DOWN_DIST = 100; // px downward to trigger close
const SWIPE_DOWN_VEL = 800; // px/s downward velocity to trigger close
const SWIPE_HORIZ_DIST = 60; // px horizontal to trigger navigation
const SWIPE_HORIZ_VEL = 400; // px/s horizontal velocity to trigger navigation

import { igdbImageUrl } from "@gaming-zone/utils";

import type {
  GalleryImage,
  ZoomableImageProps,
  ImageGalleryAdvancedProps,
} from "../../types";

// ─── ZoomableImage ────────────────────────────────────────────────────────────
//
// Provides pinch-to-zoom and pan when zoomed.
// At scale 1× swipe gestures are interpreted as navigation / close commands.

const ZoomableImage: React.FC<ZoomableImageProps> = ({
  imageUrl,
  onSwipeLeft,
  onSwipeRight,
  onSwipeDown,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const pinchAnim = useRef(new Animated.Value(1)).current;
  const lastScale = useRef(1);
  const lastTX = useRef(0);
  const lastTY = useRef(0);

  const resetPan = useCallback((): void => {
    translateX.setValue(0);
    translateY.setValue(0);
    translateX.setOffset(0);
    translateY.setOffset(0);
    lastTX.current = 0;
    lastTY.current = 0;
  }, [translateX, translateY]);

  const snapBack = useCallback((): void => {
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
    translateX.setOffset(0);
    translateY.setOffset(0);
    lastTX.current = 0;
    lastTY.current = 0;
  }, [translateX, translateY]);

  const onPinchEvent: (e: PinchGestureHandlerGestureEvent) => void =
    Animated.event([{ nativeEvent: { scale: pinchAnim } }], {
      useNativeDriver: true,
    });

  const onPinchStateChange = useCallback(
    (event: HandlerStateChangeEvent<PinchGestureHandlerEventPayload>): void => {
      if (event.nativeEvent.oldState !== State.ACTIVE) return;

      lastScale.current = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, lastScale.current * event.nativeEvent.scale),
      );

      if (lastScale.current === MIN_SCALE) resetPan();

      scale.setValue(lastScale.current);
      pinchAnim.setValue(1);
    },
    [scale, pinchAnim, resetPan],
  );

  const onPanEvent: (e: PanGestureHandlerGestureEvent) => void = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true },
  );

  const onPanStateChange = useCallback(
    (event: HandlerStateChangeEvent<PanGestureHandlerEventPayload>): void => {
      if (event.nativeEvent.oldState !== State.ACTIVE) return;

      const {
        translationX: tx,
        translationY: ty,
        velocityX: vx,
        velocityY: vy,
      } = event.nativeEvent;

      if (lastScale.current <= MIN_SCALE) {
        // ── At normal zoom: interpret as swipe gesture ──────────────────────
        const absX = Math.abs(tx);
        const absY = Math.abs(ty);

        if (ty > SWIPE_DOWN_DIST || vy > SWIPE_DOWN_VEL) {
          resetPan();
          onSwipeDown?.();
          return;
        }

        if (
          absX > absY &&
          (absX > SWIPE_HORIZ_DIST || Math.abs(vx) > SWIPE_HORIZ_VEL)
        ) {
          resetPan();
          if (tx < 0) onSwipeLeft?.();
          else onSwipeRight?.();
          return;
        }

        snapBack();
        return;
      }

      // ── Zoomed in: accumulate pan offsets ───────────────────────────────
      lastTX.current += tx;
      lastTY.current += ty;
      translateX.setOffset(lastTX.current);
      translateX.setValue(0);
      translateY.setOffset(lastTY.current);
      translateY.setValue(0);
    },
    [
      translateX,
      translateY,
      resetPan,
      snapBack,
      onSwipeDown,
      onSwipeLeft,
      onSwipeRight,
    ],
  );

  const handleDoubleTap = useCallback((): void => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
    lastScale.current = 1;
    resetPan();
  }, [scale, translateX, translateY, resetPan]);

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
                      { scale: Animated.multiply(scale, pinchAnim) },
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

// ─── ImageGalleryAdvanced ─────────────────────────────────────────────────────

const ImageGalleryAdvanced: React.FC<ImageGalleryAdvancedProps> = ({
  coverImageId,
  screenshots = [],
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { i18n } = useTranslation();
  const isRtl = i18n.language !== "en";

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
      const index = Math.round(
        event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
      );
      setActiveIndex(index);
    },
    [],
  );

  const openFullScreen = useCallback((index: number): void => {
    setFullScreenIndex(index);
    setFullScreenVisible(true);
  }, []);

  const closeFullScreen = useCallback((): void => {
    setFullScreenVisible(false);
  }, []);

  const goToNext = useCallback((): void => {
    setFullScreenIndex((prev) => Math.min(prev + 1, allImages.length - 1));
  }, [allImages.length]);

  const goToPrevious = useCallback((): void => {
    setFullScreenIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  if (allImages.length === 0) {
    return <View style={styles.placeholder} />;
  }

  const imageCount = allImages.length;
  const isFirst = fullScreenIndex === 0;
  const isLast = fullScreenIndex === imageCount - 1;

  return (
    <View style={styles.container}>
      {/* ── Horizontal paging thumbnail strip ─────────────────────────── */}
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
            style={styles.thumbnailContainer}
            accessibilityLabel={`Image ${index + 1} of ${allImages.length}`}
            accessibilityRole="imagebutton"
            accessibilityHint="Double tap to view full screen"
          >
            <Image
              style={styles.thumbnail}
              source={image.thumbnail}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            {/* Side-gradient overlay — direction mirrors app locale */}
            <View
              style={[
                styles.gradientOverlay,
                { flexDirection: isRtl ? "row-reverse" : "row" },
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

      {/* ── Dot pagination ─────────────────────────────────────────────── */}
      {imageCount > 1 && (
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
          <Ionicons name="images-outline" size={16} color="#fff" />
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
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={styles.fullScreenContainer}>
            {/* Top controls */}
            <View style={styles.topControls}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeFullScreen}
                accessibilityLabel="Close gallery"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <View style={styles.fullScreenCounter}>
                <CustomText style={styles.fullScreenCounterText}>
                  {fullScreenIndex + 1} / {imageCount}
                </CustomText>
              </View>
            </View>

            {/* Swipe-hint chevrons (non-interactive — hint only) */}
            {imageCount > 1 && (
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

            <View style={styles.imageArea}>
              <ZoomableImage
                key={fullScreenIndex}
                imageUrl={allImages[fullScreenIndex]?.url ?? ""}
                onSwipeLeft={!isLast ? goToNext : undefined}
                onSwipeRight={!isFirst ? goToPrevious : undefined}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { width: "100%", height: 350, position: "relative" },
  scrollView: { width: "100%", height: "100%" },
  placeholder: {
    width: "100%",
    height: 350,
    backgroundColor: COLORS.secondary,
  },
  thumbnailContainer: {
    width: SCREEN_WIDTH,
    height: 350,
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.secondary,
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
  closeButton: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 25,
    padding: 10,
  },
  fullScreenCounter: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  fullScreenCounterText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  imageArea: { flex: 1, justifyContent: "center", alignItems: "center" },
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
});
