import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import CustomText from "@/src/components/CustomText";
import { SLIDE_WIDTH, VIDEO_HEIGHT } from "../../lib/layout";
import { SCRIM_DESCRIPTION_COLOR, SCRIM_GRADIENT, SCRIM_TITLE_COLOR } from "./scrim";
import type { SlideContentProps } from "./types";

/**
 * A slide's text panel. The panel is a fixed dark scrim layered over the
 * background video with white text on it, so it deliberately does not follow
 * the theme — a light scrim would wash out arbitrary video content.
 */
const SlideContent = memo(({ title, description }: SlideContentProps): React.ReactElement => (
  <View style={staticStyles.slide}>
    <View style={staticStyles.videoPlaceholder} />
    <LinearGradient colors={SCRIM_GRADIENT} style={staticStyles.contentPanel}>
      <CustomText style={staticStyles.slideTitle}>{title}</CustomText>
      <CustomText style={staticStyles.slideDescription}>{description}</CustomText>
    </LinearGradient>
  </View>
));

SlideContent.displayName = "SlideContent";

const staticStyles = StyleSheet.create({
  slide: {
    width: SLIDE_WIDTH,
    flex: 1,
  },
  videoPlaceholder: {
    width: SLIDE_WIDTH,
    height: VIDEO_HEIGHT,
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
  slideTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: SCRIM_TITLE_COLOR,
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  slideDescription: {
    fontSize: 14,
    color: SCRIM_DESCRIPTION_COLOR,
    textAlign: "center",
    lineHeight: 22,
  },
});

export default SlideContent;
