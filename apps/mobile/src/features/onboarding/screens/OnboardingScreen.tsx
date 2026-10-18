import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import OnboardingActions from "../components/onboarding/OnboardingActions";
import OnboardingBackground from "../components/onboarding/OnboardingBackground";
import OnboardingDots from "../components/onboarding/OnboardingDots";
import OnboardingSlidesList from "../components/onboarding/OnboardingSlidesList";
import { useOnboardingNavigation } from "../hooks/useOnboardingNavigation";
import { useOnboardingSlides } from "../hooks/useOnboardingSlides";

interface OnboardingScreenProps {
  onDone: () => void;
}

/**
 * First-run carousel: one shared background clip behind swipeable slides, with
 * paging dots and a skip / next / get-started footer.
 */
const OnboardingScreen = memo(({ onDone }: OnboardingScreenProps): React.ReactElement => {
  const { slides, total } = useOnboardingSlides();
  const { activeIndex, isLast, listRef, onMomentumScrollEnd, goNext } =
    useOnboardingNavigation(total, onDone);

  const styles = useThemeStyles((c) => ({
    safeArea: {
      flex: 1,
      backgroundColor: c.background,
    },
    controls: {
      paddingHorizontal: 24,
      paddingBottom: 12,
      paddingTop: 8,
      backgroundColor: c.background,
    },
  }));

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom", "right", "left"]}>
      <View style={staticStyles.slidesWrapper}>
        <OnboardingBackground activeIndex={activeIndex} />

        <OnboardingSlidesList
          slides={slides}
          listRef={listRef}
          onMomentumScrollEnd={onMomentumScrollEnd}
        />
      </View>

      <View style={styles.controls}>
        <OnboardingDots count={total} activeIndex={activeIndex} />

        <OnboardingActions isLast={isLast} onSkip={onDone} onNext={goNext} />
      </View>
    </SafeAreaView>
  );
});

OnboardingScreen.displayName = "OnboardingScreen";

const staticStyles = StyleSheet.create({
  slidesWrapper: {
    flex: 1,
    position: "relative",
  },
});

export default OnboardingScreen;
