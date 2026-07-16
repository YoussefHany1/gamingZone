export const getYoutubeThumbnailUrl = (videoId: string) =>
  `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

export const getYoutubeEmbedUrl = (videoId: string) =>
  `https://www.youtube.com/embed/${videoId}?autoplay=1`;

export const getGameCoverUrl = (coverId?: string) =>
  coverId
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${coverId}.webp`
    : "/assets/image-not-found.webp";

export const getEmbedInfo = (
  rawUrl: string,
): { isEmbeddable: boolean; embedUrl: string } => {
  try {
    const urlObj = new URL(rawUrl);

    // YouTube
    if (
      urlObj.hostname.includes("youtube.com") ||
      urlObj.hostname.includes("youtu.be")
    ) {
      const videoId =
        urlObj.searchParams.get("v") || urlObj.pathname.split("/").pop();
      return {
        isEmbeddable: true,
        embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1`,
      };
    }

    // Twitch
    if (urlObj.hostname.includes("twitch.tv")) {
      const channel = urlObj.pathname.split("/")[1];
      let hostname = "localhost";
      if (typeof window !== "undefined") {
        hostname = window.location.hostname;
      }
      return {
        isEmbeddable: true,
        embedUrl: `https://player.twitch.tv/?channel=${channel}&parent=${hostname}`,
      };
    }

    return { isEmbeddable: false, embedUrl: rawUrl };
  } catch {
    return { isEmbeddable: false, embedUrl: rawUrl };
  }
};
