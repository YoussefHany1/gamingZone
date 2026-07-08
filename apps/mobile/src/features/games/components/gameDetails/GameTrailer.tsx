import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { useTranslation } from "react-i18next";
import { sharedStyles } from "./shared";
import type { Video, GameTrailerProps } from "../../types";

/**
 * Priority order for selecting which video to display as the trailer.
 * The first match found in this list wins.
 */
const TRAILER_NAME_PRIORITY = [
  "Trailer",
  "Announcement Trailer",
  "Teaser",
  "Release Date Trailer",
  "Gameplay Trailer",
] as const;

/** Finds the highest-priority trailer video from the provided list, or undefined. */
function findTrailer(videos: Video[]): Video | undefined {
  for (const name of TRAILER_NAME_PRIORITY) {
    const match = videos.find((v) => v.name === name);
    if (match) return match;
  }
  return undefined;
}

const GameTrailer: React.FC<GameTrailerProps> = ({ videos }) => {
  const { t } = useTranslation();

  if (!videos?.length) return null;

  const trailer = findTrailer(videos);
  if (!trailer?.video_id) return null;

  return (
    <View style={styles.container}>
      <Text style={sharedStyles.sectionHeader}>
        {t("games.details.trailer")}
      </Text>
      <View style={styles.playerWrapper}>
        <YoutubePlayer height={250} videoId={trailer.video_id} />
      </View>
    </View>
  );
};

export default memo(GameTrailer);

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  playerWrapper: {
    marginTop: 20,
  },
});
