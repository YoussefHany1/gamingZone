import React from "react";
import { Image } from "expo-image";
import type { StyleProp, ImageStyle } from "react-native";
import { igdbImageUrl } from "@gaming-zone/utils";
import type { Game } from "@/src/types/sharedTypes";

/**
 * The cover block every games-feed card renders: the IGDB cover when the
 * game has one, the bundled "image not found" asset otherwise, with the
 * shared `contentFit`/`cachePolicy` contract of the Phase 3 ports.
 * The `recyclingKey` was NOT uniform across those cards — the rank-badge
 * and poster cards (Popular/Recommended/TopRated/Steam top sellers)
 * rendered without one, while the rest derived the same fallback formula
 * (`cover.image_id || id.toString()`). `deriveRecyclingKey` preserves
 * exactly that: cards that had one set it, and it computes the identical
 * formula inline rather than silently spreading it everywhere.
 *
 * Cover art stays `cover_big` for every consumer except the ComingSoon
 * card, whose full-bleed background is a `screenshot_med` — as in the
 * legacy.
 *
 * Phase 4 extraction from the nine card files that each carried their own
 * copy of this block.
 */
export type CoverImageProps = {
  item: Game;
  imageSize?: "cover_big" | "screenshot_med";
  /** Render the legacy-derived recyclingKey (`cover.image_id || id`). */
  deriveRecyclingKey?: boolean;
  style?: StyleProp<ImageStyle>;
};

function CoverImage({
  item,
  imageSize = "cover_big",
  deriveRecyclingKey = false,
  style,
}: CoverImageProps): React.ReactElement {
  return (
    <Image
      source={
        item.cover
          ? {
              uri: igdbImageUrl(item.cover.image_id, imageSize),
            }
          : require("@/assets/image-not-found.webp")
      }
      style={style}
      contentFit="cover"
      cachePolicy="memory-disk"
      {...(deriveRecyclingKey && {
        recyclingKey: item.cover?.image_id || item.id.toString(),
      })}
    />
  );
}

export { CoverImage };
