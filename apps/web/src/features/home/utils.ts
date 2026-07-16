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
    return `https://images.igdb.com/igdb/image/upload/t_1080p/${item.screenshots[0].image_id}.webp`;
  }
  if (item.cover?.image_id) {
    return `https://images.igdb.com/igdb/image/upload/t_cover_big/${item.cover.image_id}.webp`;
  }
  return "/assets/image-not-found.webp";
}

export function getCoverSource(item: Game) {
  if (item.cover?.image_id) {
    return `https://images.igdb.com/igdb/image/upload/t_cover_big/${item.cover.image_id}.webp`;
  }
  return "/assets/image-not-found.webp";
}
