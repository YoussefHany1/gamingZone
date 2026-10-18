import type { RefObject } from "react";
import type {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import type { OnboardingSlide } from "../../types";

export type SlideContentProps = {
  title: string;
  description: string;
};

export type OnboardingBackgroundProps = {
  /** The slide whose clip should be playing. */
  activeIndex: number;
};

export type OnboardingSlidesListProps = {
  slides: OnboardingSlide[];
  /** Owned by the screen's navigation hook, which pages the list from the footer. */
  listRef: RefObject<FlatList<OnboardingSlide> | null>;
  onMomentumScrollEnd: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

export type OnboardingDotsProps = {
  count: number;
  activeIndex: number;
};

export type OnboardingActionsProps = {
  /** On the last slide the CTA finishes onboarding instead of advancing. */
  isLast: boolean;
  onSkip: () => void;
  onNext: () => void;
};
