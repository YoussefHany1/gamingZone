import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "../constants/colors";

const { width, height } = Dimensions.get("window");

// Assets
const SLIDE_VIDEOS = [
  require("../assets/news.mp4"),
  // require("../assets/games-news.mp4"),
  require("../assets/list.mp4"),
  require("../assets/free-games.mp4"),
  require("../assets/notification.mp4"),
] as const;

// Props 
interface OnboardingScreenProps {
  onDone: () => void;
}

// Static Slide (no player — text + icon only)
interface SlideContentProps {
  index: number;
  title: string;
  description: string;
}

const SlideContent = React.memo(
  ({ index, title, description }: SlideContentProps) => (
    <View style={styles.slide}>
      {/* Video placeholder — shared player renders on top */}
      <View style={styles.videoPlaceholder} />

      {/* Content panel */}
      <LinearGradient
        colors={["#1a3560", "#0c1a33"]}
        style={styles.contentPanel}
      >
        {/* <Text style={styles.icon}>{SLIDE_ICONS[index]}</Text> */}
        <Text style={styles.slideTitle}>{title}</Text>
        <Text style={styles.slideDescription}>{description}</Text>
      </LinearGradient>
    </View>
  )
);
SlideContent.displayName = "SlideContent";

// Main Onboarding Screen
export default function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const { t } = useTranslation();
  // const isRTL = i18n.language === "ar" || I18nManager.isRTL;
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<any>(null);

  const slides = useMemo(
    () =>
      t("onboarding.slides", { returnObjects: true }) as Array<{
        title: string;
        description: string;
      }>,
    [t]
  );

  const TOTAL = slides.length;

  // Single shared video player
  // IMPORTANT: the setup callback MUST be stable (useCallback with []).
  // A new function reference on every render caused useVideoPlayer to
  // re-initialise the player each render → setState inside commitLayout
  // → "Maximum update depth exceeded" crash (Firebase issue #41dac7f6).
  const setupPlayer = useCallback((p: any) => {
    p.loop = true;
    p.muted = true;
    p.play();
  }, []); // empty deps → stable reference, never recreated

  const player = useVideoPlayer(SLIDE_VIDEOS[0], setupPlayer);

  // Swap source whenever active slide changes
  useEffect(() => {
    player.replaceAsync(SLIDE_VIDEOS[activeIndex])
      .then(() => player.play())
      .catch(() => {
        player.replace(SLIDE_VIDEOS[activeIndex]);
        player.play();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]); // ← intentionally omit player to prevent infinite loop

  // Handlers
  const onMomentumScrollEnd = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / width);
    if (newIndex >= 0 && newIndex < TOTAL) {
      setActiveIndex(newIndex);
    }
  }, [TOTAL]);

  const goNext = useCallback(() => {
    if (activeIndex < TOTAL - 1) {
      const nextIndex = activeIndex + 1;
      // Update index immediately for dots/button state
      setActiveIndex(nextIndex);
      // Scroll without triggering onMomentumScrollEnd to avoid double setState
      flatListRef.current?.scrollToOffset({
        offset: nextIndex * width,
        animated: true,
      });
    } else {
      onDone();
    }
  }, [activeIndex, TOTAL, onDone]);

  const renderItem = useCallback(
    ({
      item,
      index,
    }: {
      item: { title: string; description: string };
      index: number;
    }) => (
      <SlideContent
        index={index}
        title={item.title}
        description={item.description}
      />
    ),
    []
  );

  const keyExtractor = useCallback((_: unknown, i: number) => String(i), []);

  const isLast = activeIndex === TOTAL - 1;

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "right", "left"]}>
      {/* Slides */}
      <View style={styles.slidesWrapper}>
        {/* Single shared video overlay — placed BEFORE FlatList so it naturally renders behind it! */}
        <View style={styles.sharedVideoContainer} pointerEvents="none">
          <VideoView
            player={player}
            style={styles.video}
            contentFit="cover"
            nativeControls={false}
          />
        </View>

        <FlatList<{ title: string; description: string }>
          ref={flatListRef}
          data={slides}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
          scrollEnabled={true}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews={false}
        />
      </View>

      {/* Bottom Controls */}
      <View style={styles.controls}>
        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonsRow}>
          {/* Skip — hidden on the last slide */}
          <TouchableOpacity
            onPress={onDone}
            style={[styles.skipBtn, isLast && styles.invisible]}
            disabled={isLast}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>{t("onboarding.skip")}</Text>
          </TouchableOpacity>

          {/* Next / Get Started */}
          <TouchableOpacity
            onPress={goNext}
            style={styles.nextBtn}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#779bdd", "#516996"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextGradient}
            >
              <Text style={styles.nextText}>
                {isLast ? t("onboarding.getStarted") : t("onboarding.next")}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Styles
const CONTROLS_HEIGHT = 150;
const VIDEO_HEIGHT = height - CONTROLS_HEIGHT - 150;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  slidesWrapper: {
    flex: 1,
    position: "relative",
  },

  // Slide content (text lives inside FlatList items)
  slide: {
    width,
    flex: 1,
  },
  videoPlaceholder: {
    width,
    height: VIDEO_HEIGHT,
    backgroundColor: "transparent",
  },
  contentPanel: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 8,
    alignItems: "center",
    justifyContent: "center",
    borderTopRightRadius: 38,
    borderTopLeftRadius: 38,
  },
  icon: {
    fontSize: 38,
    marginBottom: 10,
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  slideDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    lineHeight: 22,
  },

  // Shared video overlay (absolute, covers the video zone)
  sharedVideoContainer: {
    position: "absolute",
    top: 0,
    width,
    height: "100%",
    overflow: "hidden",
    backgroundColor: COLORS.darkBackground,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  videoGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },

  // Controls
  controls: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    paddingTop: 8,
    backgroundColor: COLORS.primary,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.lightGray,
  },
  dotInactive: {
    width: 8,
    backgroundColor: "rgba(119,155,221,0.35)",
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  invisible: {
    opacity: 0,
  },
  skipText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 15,
    fontWeight: "500",
  },
  nextBtn: {
    borderRadius: 28,
    overflow: "hidden",
    elevation: 4,
    shadowColor: COLORS.lightGray,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  nextGradient: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 28,
  },
  nextText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
