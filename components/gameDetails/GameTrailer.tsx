import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { useTranslation } from "react-i18next";
import COLORS from "../../constants/colors";
import type { Video } from "./types";

interface Props {
  videos?: Video[];
}

const TRAILER_NAMES = ["Trailer", "Announcement Trailer", "Teaser", "Release Date Trailer", "Gameplay Trailer"];

const GameTrailer: React.FC<Props> = ({ videos }) => {
  const { t } = useTranslation();

  if (!videos) return null;

  const trailer = TRAILER_NAMES.reduce<Video | undefined>(
    (found, name) => found ?? videos.find((v) => v.name === name),
    undefined
  );

  if (!trailer?.video_id) return null;

  return (
    <View style={styles.trailerContainer}>
      <Text style={styles.detailsHeader}>{t("games.details.trailer")}</Text>
      <View style={styles.ytVid}>
        <YoutubePlayer height={250} videoId={trailer.video_id} />
      </View>
    </View>
  );
};

export default memo(GameTrailer);

const styles = StyleSheet.create({
  detailsHeader: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginTop: 10,
  },
  trailerContainer: {
    marginTop: 20,
  },
  ytVid: {
    marginTop: 20,
  },
});
