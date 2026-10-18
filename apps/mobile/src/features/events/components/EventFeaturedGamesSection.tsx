import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { GestureScrollView } from "@/src/components/GestureScrollView";
import SectionTitle from "@/src/components/SectionTitle";
import { useTranslation } from "react-i18next";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import GameCard from "./GameCard";
import type { EventFeaturedGamesSectionProps } from "../types";

const staticStyles = StyleSheet.create({
  listContent: { paddingHorizontal: 4 },
});

/** "Featured Games" section: horizontal game cover list. */
const EventFeaturedGamesSection: React.FC<EventFeaturedGamesSectionProps> = ({
  games,
}) => {
  const { t } = useTranslation();
  const styles = useThemeStyles(() => ({
    section: { marginTop: 24 },
  }));

  return (
    <View style={styles.section}>
      <SectionTitle title={t("events.featuredGames") || "Featured Games"} />
      <FlashList
        renderScrollComponent={GestureScrollView}
        data={games}
        horizontal
        keyExtractor={(g) => String(g.id)}
        renderItem={({ item }) => <GameCard game={item} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={staticStyles.listContent}
        scrollEnabled
      />
    </View>
  );
};

export default memo(EventFeaturedGamesSection);
