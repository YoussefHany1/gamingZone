import type { Game } from "@gaming-zone/core";

const FALLBACK_COVER = "/assets/image-not-found.webp";

export function parseGameTimestamp(
  timestamp?: string | number | null,
): number | null {
  if (!timestamp) return null;

  if (typeof timestamp === "string") {
    return Math.floor(new Date(timestamp).getTime() / 1000);
  }

  // If timestamp is in milliseconds (e.g. > 1e11), convert to seconds
  return timestamp > 1e11 ? Math.floor(timestamp / 1000) : timestamp;
}

/** Builds the IGDB cover URL for a game, with a local fallback image. */
export function gameCoverUrl(
  game: Pick<Game, "cover">,
  size: "cover_big" | "cover_small" = "cover_big",
): string {
  return game.cover?.image_id
    ? `https://images.igdb.com/igdb/image/upload/t_${size}/${game.cover.image_id}.webp`
    : FALLBACK_COVER;
}
