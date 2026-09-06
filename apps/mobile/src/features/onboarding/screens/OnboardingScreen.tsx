import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import CustomText from "@/src/components/CustomText";
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import COLORS from "@/src/constants/colors";
import { cacheVideo, preloadVideos } from "@/src/utils/videoPreloader";

const { width, height } = Dimensions.get("window");

// Assets (q_auto + f_auto optimize size/codec; reducing doesn't exist server-side)
const SLIDE_VIDEOS = [
  "https://res.cloudinary.com/dewusw0db/video/upload/q_auto,f_auto/v1787524025/news.mp4",
  "https://res.cloudinary.com/dewusw0db/video/upload/q_auto,f_auto/v1787524037/list.mp4",
  "https://res.cloudinary.com/dewusw0db/video/upload/q_auto,f_auto/v1787524017/free-games.mp4",
  "https://res.cloudinary.com/dewusw0db/video/upload/q_auto,f_auto/v1787523999/notification.mp4",
] as const;

interface OnboardingScreenProps {
  onDone: () => void;
}

interface SlideContentProps {
  index: number;
  title: string;
  description: string;
}

const SlideContent = React.memo(
  ({ index, title, description }: SlideContentProps) => (
    <View style={styles.slide}>
      <View style={styles.videoPlaceholder} />
      <LinearGradient
        colors={["#1a3560", "#0c1a33"]}
        style={styles.contentPanel}
      >
        <CustomText style={styles.slideTitle}>{title}</CustomText>
        <CustomText style={styles.slideDescription}>{description}</CustomText>
      </LinearGradient>
    </View>
  ),
);
SlideContent.displayName = "SlideContent";

export default function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<any>(null);
  const prevIndexRef = useRef<number>(0);

  const slides = useMemo(
    () =>
      t("onboarding.slides", { returnObjects: true }) as Array<{
        title: string;
        description: string;
      }>,
    [t],
  );

  const TOTAL = slides.length;

  // Player: يبدأ من المصدر المحلي للفيديو الأول إذا كان مُخزناً مؤقتاً
  const [cachedSources, setCachedSources] = useState<Record<number, string>>({});

  // تحميل الفيديو الحالي محلياً أولاً ثم تشغيله من القرص (بدون انتظار الشبكة)
  useEffect(() => {
    let cancelled = false;
    const url = SLIDE_VIDEOS[activeIndex];
    if (!url) return;
    cacheVideo(url).then((localUri) => {
      if (!cancelled) {
        setCachedSources((prev) =>
          prev[activeIndex] === localUri ? prev : { ...prev, [activeIndex]: localUri },
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeIndex]);

  // تحميل الفيديو التالي في الخلفية ليكون جاهزاً عند التمرير
  useEffect(() => {
    const next = activeIndex + 1;
    const nextUrl = SLIDE_VIDEOS[next];
    if (nextUrl) {
      preloadVideos([nextUrl]);
    }
  }, [activeIndex]);

  const initPlayer = useCallback((p: any) => {
    p.loop = true;
    p.muted = true;
    p.play();
  }, []);

  const player = useVideoPlayer(
    cachedSources[activeIndex] ?? SLIDE_VIDEOS[activeIndex]!,
    initPlayer,
  );

  // عند تغيير الـ slide استبدل الـ source: محلي من الكاش إن وُجد، وإلا من الرابط
  useEffect(() => {
    if (prevIndexRef.current === activeIndex) return;
    prevIndexRef.current = activeIndex;
    const localUri = cachedSources[activeIndex];
    player.replace(localUri ?? SLIDE_VIDEOS[activeIndex]!);
    player.loop = true;
    player.muted = true;
    player.play();
  }, [activeIndex, player, cachedSources]);

  // Handlers
  const onMomentumScrollEnd = useCallback(
    (event: any) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const newIndex = Math.round(offsetX / width);
      if (newIndex >= 0 && newIndex < TOTAL) {
        // استخدام prev للتأكد التام من عدم تحديث الـ State إلا إذا تغير الرقم فعلاً
        setActiveIndex((prev) => (prev === newIndex ? prev : newIndex));
      }
    },
    [TOTAL],
  );

  const goNext = useCallback(() => {
    if (activeIndex < TOTAL - 1) {
      const nextIndex = activeIndex + 1;
      setActiveIndex(nextIndex);
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
    [],
  );

  const keyExtractor = useCallback((_: unknown, i: number) => String(i), []);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [],
  );

  const isLast = activeIndex === TOTAL - 1;

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "right", "left"]}>
      <View style={styles.slidesWrapper}>
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
          getItemLayout={getItemLayout}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews={false}
        />
      </View>

      <View style={styles.controls}>
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

        <View style={styles.buttonsRow}>
          <TouchableOpacity
            onPress={onDone}
            style={[styles.skipBtn, isLast && styles.invisible]}
            disabled={isLast}
            activeOpacity={0.7}
          >
            <CustomText style={styles.skipText}>{t("onboarding.skip")}</CustomText>
          </TouchableOpacity>

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
              <CustomText style={styles.nextText}>
                {isLast ? t("onboarding.getStarted") : t("onboarding.next")}
              </CustomText>
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
