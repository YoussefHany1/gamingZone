import React, { memo, useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Image,
} from "react-native";
import { Play, X } from "lucide-react-native";
import CustomText from "@/src/components/CustomText";
import YoutubePlayer from "react-native-youtube-iframe";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/src/hooks/useTheme";
import { useSharedStyles } from "./shared";
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

/**
 * The trailer shows as a static YouTube thumbnail with a play button.
 * The actual `YoutubePlayer` (a full WebView — 100–200 MB of native memory
 * once YouTube's player loads) is mounted ONLY inside the modal after the
 * user taps play, matching `Slideshow.tsx`. Mounting it eagerly on every
 * GameDetails screen ballooned the native heap to >1.5 GB, which stalled
 * the JS thread (GC pauses) and made input — including the back gesture —
 * get dropped or land seconds late.
 */
const GameTrailer: React.FC<GameTrailerProps> = ({ videos }) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const sharedStyles = useSharedStyles();
  const [playing, setPlaying] = useState(false);

  if (!videos?.length) return null;

  const trailer = findTrailer(videos);
  if (!trailer?.video_id) return null;

  const thumbnail = `https://img.youtube.com/vi/${trailer.video_id}/hqdefault.jpg`;

  return (
    <View style={styles.container}>
      <CustomText style={sharedStyles.sectionHeader}>
        {t("games.details.trailer")}
      </CustomText>
      <Pressable
        onPress={() => setPlaying(true)}
        style={styles.playerWrapper}
        accessibilityRole="button"
        accessibilityLabel={t("games.details.trailer")}
      >
        <Image
          source={{ uri: thumbnail }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        <View style={[styles.playOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[styles.playButton, { backgroundColor: colors.accent }]}
          >
            <Play size={28} color={colors.onAccent} fill={colors.onAccent} />
          </View>
        </View>
      </Pressable>

      <Modal
        visible={playing}
        transparent
        animationType="fade"
        onRequestClose={() => setPlaying(false)}
      >
        <View
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPlaying(false)}
            accessibilityLabel={t("common.close")}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface },
            ]}
          >
            <Pressable
              onPress={() => setPlaying(false)}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
            >
              <X size={24} color={colors.text} />
            </Pressable>
            {/* Mounted only while the modal is open — the WebView is torn
                down on close, freeing the YouTube player's memory. */}
            {playing && (
              <YoutubePlayer
                height={250}
                play
                videoId={trailer.video_id}
              />
            )}
          </View>
        </View>
      </Modal>
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
  thumbnail: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
  },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    width: "92%",
    borderRadius: 12,
    padding: 12,
  },
  closeBtn: {
    alignSelf: "flex-end",
    padding: 4,
    marginBottom: 4,
  },
});
