import React, { memo, useCallback } from "react";
import { FlatList } from "react-native";
import type { ListRenderItemInfo } from "react-native";
import { SLIDE_WIDTH } from "../../lib/layout";
import type { OnboardingSlide } from "../../types";
import SlideContent from "./SlideContent";
import type { OnboardingSlidesListProps } from "./types";

/**
 * The swipeable pager. It reports every settled page so the screen can move
 * its dots, and lets the footer page it programmatically through `listRef`.
 */
const OnboardingSlidesList = memo(
  ({ slides, listRef, onMomentumScrollEnd }: OnboardingSlidesListProps): React.ReactElement => {
    const renderItem = useCallback(
      ({ item }: ListRenderItemInfo<OnboardingSlide>): React.ReactElement => (
        <SlideContent title={item.title} description={item.description} />
      ),
      [],
    );

    const keyExtractor = useCallback(
      (_item: OnboardingSlide, index: number): string => String(index),
      [],
    );

    const getItemLayout = useCallback(
      (_data: ArrayLike<OnboardingSlide> | null | undefined, index: number) => ({
        length: SLIDE_WIDTH,
        offset: SLIDE_WIDTH * index,
        index,
      }),
      [],
    );

    return (
      <FlatList<OnboardingSlide>
        ref={listRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        scrollEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={getItemLayout}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews={false}
      />
    );
  },
);

OnboardingSlidesList.displayName = "OnboardingSlidesList";

export default OnboardingSlidesList;
