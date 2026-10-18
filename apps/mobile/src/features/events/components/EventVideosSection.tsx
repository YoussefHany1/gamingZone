import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { GestureScrollView } from "@/src/components/GestureScrollView";
import SectionTitle from "@/src/components/SectionTitle";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import VideoCard from "./VideoCard";
import type { EventVideosSectionProps } from "../types";

const staticStyles = StyleSheet.create({
  listContent: { paddingHorizontal: 4 },
});

/** "Videos" section: horizontal trailer list. */
const EventVideosSection: React.FC<EventVideosSectionProps> = ({ videos }) => {
  const styles = useThemeStyles(() => ({
    section: { marginTop: 24 },
  }));

  return (
    <View style={styles.section}>
      <SectionTitle title="Videos" />
      <FlashList
        renderScrollComponent={GestureScrollView}
        data={videos}
        horizontal
        keyExtractor={(v) => v.video_id}
        renderItem={({ item }) => <VideoCard video={item} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={staticStyles.listContent}
        scrollEnabled
      />
    </View>
  );
};

export default memo(EventVideosSection);
