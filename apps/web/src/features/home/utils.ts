import { igdbImageUrl } from "@gaming-zone/utils";
import { SlideshowGame as Game } from "./types";

export function getTrailerVideoId(item: Game): string | undefined {
  const video =
    item.videos?.find((v) => v.name?.toLowerCase().includes("trailer")) ??
    item.videos?.[0];
  return video?.video_id;
}

export function hasVideo(item: Game): boolean {
  return !!getTrailerVideoId(item);
}

export function getImageSource(item: Game) {
  if (item.screenshots?.[0]?.image_id) {
    return igdbImageUrl(item.screenshots[0].image_id, "1080p");
  }
  if (item.cover?.image_id) {
    return igdbImageUrl(item.cover.image_id, "cover_big");
  }
  return "/assets/image-not-found.webp";
}

export function getCoverSource(item: Game) {
  if (item.cover?.image_id) {
    return igdbImageUrl(item.cover.image_id, "cover_big");
  }
  return "/assets/image-not-found.webp";
}
