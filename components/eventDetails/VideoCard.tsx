import React, { memo, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, Dimensions } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { GamingEventVideo } from "../types";

const { width } = Dimensions.get("window");

interface VideoCardProps { video: GamingEventVideo }
const VideoCard = memo<VideoCardProps>(({ video }) => {
  const handlePress = useCallback(() => {
    Linking.openURL(`https://www.youtube.com/watch?v=${video.video_id}`).catch(() =>
      console.error("Failed to open video")
    );
  }, [video.video_id]);

  return (
    <TouchableOpacity style={styles.videoCard} onPress={handlePress} activeOpacity={0.8}>
      <Image
        recyclingKey={video.video_id}
        source={`https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`}
        style={styles.videoThumb}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <LinearGradient
        colors={["transparent", "rgba(12,26,51,0.85)"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.playButton}>
        <Ionicons name="play-circle" size={44} color="#fff" />
      </View>
      {video.name ? (
        <Text style={styles.videoName} numberOfLines={1}>
          {video.name}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
});
VideoCard.displayName = "VideoCard";
export default VideoCard;

const styles = StyleSheet.create({
  videoCard: {
    width: width * 0.6,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
    justifyContent: "flex-end",
  },
  videoThumb: {
    ...StyleSheet.absoluteFillObject,
  },
  playButton: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  videoName: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingBottom: 8,
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
