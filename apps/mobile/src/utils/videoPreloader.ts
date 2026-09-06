import { File, Directory, Paths } from "expo-file-system";

const CACHE_DIR_NAME = "video-cache";

function stableName(url: string): string {
  try {
    return (
      new URL(url).pathname.replace(/^\/+/, "").replace(/[^\w.-]+/g, "_") + ".mp4"
    );
  } catch {
    return url.replace(/[^\w.-]+/g, "_") + ".mp4";
  }
}

function cacheDir(): Directory {
  const dir = new Directory(Paths.cache, CACHE_DIR_NAME);
  if (!dir.exists) {
    dir.create();
  }
  return dir;
}

/**
 * Returns a cached local `file://` URI for a remote video, downloading it to
 * the app cache the first time and skipping the network on subsequent calls.
 */
export async function cacheVideo(url: string): Promise<string> {
  const file = new File(cacheDir(), stableName(url));
  if (!file.exists) {
    await File.downloadFileAsync(url, file);
  }
  return file.uri;
}

/**
 * Prefetches a list of videos into the local cache without blocking the UI.
 * Failures are swallowed so a slow/failed preload never interrupts playback.
 */
export function preloadVideos(urls: string[]): void {
  for (const url of urls) {
    cacheVideo(url)
      .then(() => undefined)
      .catch(() => undefined);
  }
}