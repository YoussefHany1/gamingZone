import { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  StatusBar,
  Animated,
  Text,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  GestureHandlerRootView,
  PinchGestureHandler,
  PanGestureHandler,
  State,
} from "react-native-gesture-handler";
import COLORS from "../constants/colors";
import { useTranslation } from "react-i18next";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// مكون منفصل للصورة القابلة للتكبير
const ZoomableImage = ({ imageUrl }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const baseScale = useRef(1);
  const pinchScale = useRef(1);
  const lastScale = useRef(1);

  const baseTranslateX = useRef(0);
  const baseTranslateY = useRef(0);
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);

  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale: pinchScale.current } }],
    { useNativeDriver: true },
  );

  const onPinchStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastScale.current *= event.nativeEvent.scale;
      baseScale.current = lastScale.current;
      pinchScale.current = 1;

      // حد أقصى وأدنى للتكبير
      if (lastScale.current > 4) {
        lastScale.current = 4;
        baseScale.current = 4;
      } else if (lastScale.current < 1) {
        lastScale.current = 1;
        baseScale.current = 1;
        // إعادة التوسيط
        translateX.setValue(0);
        translateY.setValue(0);
        lastTranslateX.current = 0;
        lastTranslateY.current = 0;
      }

      scale.setValue(lastScale.current);
    }
  };

  const onPanEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX: translateX,
          translationY: translateY,
        },
      },
    ],
    { useNativeDriver: true },
  );

  const onPanStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastTranslateX.current += event.nativeEvent.translationX;
      lastTranslateY.current += event.nativeEvent.translationY;

      translateX.setOffset(lastTranslateX.current);
      translateX.setValue(0);
      translateY.setOffset(lastTranslateY.current);
      translateY.setValue(0);
    }
  };

  // Double tap للرجوع للحجم الأصلي
  const handleDoubleTap = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();

    lastScale.current = 1;
    baseScale.current = 1;
    lastTranslateX.current = 0;
    lastTranslateY.current = 0;
    translateX.setOffset(0);
    translateY.setOffset(0);
  };

  return (
    <PanGestureHandler
      onGestureEvent={onPanEvent}
      onHandlerStateChange={onPanStateChange}
      minPointers={1}
      maxPointers={1}
      enabled={lastScale.current > 1}
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
                      { scale: Animated.multiply(scale, pinchScale.current) },
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

const ImageGalleryAdvanced = ({ coverImageId, screenshots = [] }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  // دمج صورة الغلاف مع السكرين شوتس
  const allImages = [
    coverImageId
      ? {
          id: "cover",
          url: `https://images.igdb.com/igdb/image/upload/t_1080p/${coverImageId}.jpg`,
          thumbnail: `https://images.igdb.com/igdb/image/upload/t_cover_big/${coverImageId}.jpg`,
        }
      : null,
    ...screenshots.map((screenshot) => ({
      id: screenshot.id || screenshot.image_id,
      url: `https://images.igdb.com/igdb/image/upload/t_1080p/${screenshot.image_id}.jpg`,
      thumbnail: `https://images.igdb.com/igdb/image/upload/t_screenshot_med/${screenshot.image_id}.jpg`,
    })),
  ].filter(Boolean);

  const handleScroll = (event) => {
    const slideSize = SCREEN_WIDTH;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setActiveIndex(index);
  };

  const openFullScreen = (index) => {
    setFullScreenIndex(index);
    setFullScreenVisible(true);
  };

  const closeFullScreen = () => {
    setFullScreenVisible(false);
  };

  const goToNextImage = () => {
    if (fullScreenIndex < allImages.length - 1) {
      setFullScreenIndex(fullScreenIndex + 1);
    }
  };

  const goToPreviousImage = () => {
    if (fullScreenIndex > 0) {
      setFullScreenIndex(fullScreenIndex - 1);
    }
  };

  if (allImages.length === 0) {
    return (
      <Image
        style={styles.placeholderImage}
        source={require("../assets/image-not-found.webp")}
        contentFit="cover"
        transition={500}
        cachePolicy="memory-disk"
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* معرض الصور الرئيسي */}
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
            <View
              style={[
                styles.backgroundContainer,
                {
                  flexDirection: currentLang === "en" ? "row" : "row-reverse",
                },
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
      {/* مؤشرات الصور (Dots) */}
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

      {/* عداد الصور */}
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

      {/* شاشة العرض الكاملة */}
      <Modal
        visible={fullScreenVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={closeFullScreen}
      >
        <StatusBar hidden />
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={styles.fullScreenContainer}>
            {/* أزرار التحكم العلوية */}
            <View style={styles.topControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={closeFullScreen}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>

              <View style={styles.fullScreenCounterBadge}>
                <Text style={styles.fullScreenCounterText}>
                  {fullScreenIndex + 1} / {allImages.length}
                </Text>
              </View>
            </View>

            {/* الصورة القابلة للتكبير */}
            <View style={styles.imageArea}>
              <ZoomableImage
                imageUrl={allImages[fullScreenIndex].url}
                key={fullScreenIndex}
              />
            </View>

            {/* أزرار التنقل */}
            {allImages.length > 1 && (
              <View style={styles.navigationControls}>
                <TouchableOpacity
                  style={[
                    styles.navButton,
                    fullScreenIndex === 0 && styles.navButtonDisabled,
                  ]}
                  onPress={goToPreviousImage}
                  disabled={fullScreenIndex === 0}
                >
                  <Ionicons
                    name="chevron-back"
                    size={32}
                    color={fullScreenIndex === 0 ? "#666" : "#fff"}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.navButton,
                    fullScreenIndex === allImages.length - 1 &&
                      styles.navButtonDisabled,
                  ]}
                  onPress={goToNextImage}
                  disabled={fullScreenIndex === allImages.length - 1}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={32}
                    color={
                      fullScreenIndex === allImages.length - 1 ? "#666" : "#fff"
                    }
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 350,
    position: "relative",
  },
  scrollView: {
    width: "100%",
    height: "100%",
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: 350,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.secondary,
  },
  placeholderImage: {
    width: "100%",
    height: 350,
  },
  pagination: {
    flexDirection: "row",
    position: "absolute",
    bottom: 7,
    alignSelf: "center",
    backgroundColor: "rgb(0, 0, 28, 0.5)",
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
  paginationDotActive: {
    backgroundColor: COLORS.lightGray,
    width: 20,
  },
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
  counterText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
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
  fullScreenCounterText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  imageArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  navigationControls: {
    position: "absolute",
    bottom: "48%",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    zIndex: 999,
  },
  navButton: {
    borderRadius: 30,
    padding: 7,
    backgroundColor: "rgba(0, 0, 28, 0.1)",
  },
  navButtonDisabled: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  zoomContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  backgroundContainer: {
    justifyContent: "space-between",
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  gradient: {
    height: "100%",
    width: "50%",
  },
});

export default ImageGalleryAdvanced;
