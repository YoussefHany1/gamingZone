import React, { memo } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import EventStatusBadge from "./EventStatusBadge";
import type { EventHeroProps } from "../types";

const HERO_HEIGHT = 280;

/** Event hero: cover art, scrim gradient, back button, status badge, title. */
const EventHero: React.FC<EventHeroProps> = ({ event, status, logoUri, onBack }) => {
  const colors = useThemeColors();
  const styles = useThemeStyles((c) => ({
    hero: {
      width: "100%",
      height: HERO_HEIGHT,
      justifyContent: "flex-end",
      padding: 20,
    },
    backBtn: {
      position: "absolute",
      top: 44,
      left: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.scrim,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    heroBadgeRow: {
      flexDirection: "row",
      marginBottom: 8,
      gap: 8,
    },
    heroTitle: {
      color: c.text,
      fontSize: 26,
      fontWeight: "bold",
      lineHeight: 34,
      textShadowColor: "rgba(0,0,0,0.6)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 6,
    },
  }));

  return (
    <View style={styles.hero}>
      {logoUri ? (
        <Image
          recyclingKey={event.event_logo?.image_id ?? "hero"}
          source={logoUri}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <Image
          source={require("@/assets/image-not-found.webp")}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      )}
      <LinearGradient
        colors={[colors.scrimSoft, colors.scrimSolid]}
        style={StyleSheet.absoluteFill}
      />

      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
        <ArrowLeft size={24} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.heroBadgeRow}>
        <EventStatusBadge status={status} />
      </View>

      <CustomText style={styles.heroTitle}>{event.name}</CustomText>
    </View>
  );
};

export default memo(EventHero);
