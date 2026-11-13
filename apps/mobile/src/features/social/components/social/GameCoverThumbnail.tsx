import React from "react";
import AppImage from "@/src/components/AppImage";
import { igdbImageUrl } from "@gaming-zone/utils";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useGameCoverImage } from "../../hooks/useGameCoverImage";

/**
 * GameCoverThumbnail — resolves and renders the IGDB cover for a game id.
 *
 * Used inside chat bubbles (e.g. the "session confirmed" system message) so
 * the artwork appears alongside the confirmation text without each caller
 * having to thread a hook through its render function.
 */
type GameCoverThumbnailProps = {
  gameId: string | number;
};

export default function GameCoverThumbnail({ gameId }: GameCoverThumbnailProps): React.ReactElement | null {
  const coverImageId = useGameCoverImage(gameId);

  const styles = useThemeStyles((c) => ({
    cover: {
      width: 48,
      height: 48,
      borderRadius: 8,
      backgroundColor: c.skeletonBase,
      marginTop: 6,
    },
  }));

  if (!coverImageId) return null;

  return (
    <AppImage
      source={{ uri: igdbImageUrl(coverImageId, "cover_small") }}
      style={styles.cover}
      contentFit="cover"
      cachePolicy="memory-disk"
      recyclingKey={`session-cover-${gameId}`}
    />
  );
}
