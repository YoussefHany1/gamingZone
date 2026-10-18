import { useCallback, useEffect, useRef, useState } from "react";
import { useVideoPlayer } from "expo-video";
import type { VideoPlayer } from "expo-video";
import { cacheVideo, preloadVideos } from "@/src/utils/videoPreloader";
import { runAfterInteractions } from "@/src/utils/runAfterInteractions";
import { SLIDE_VIDEOS } from "../lib/slideVideos";

/** Extra settling time added once the first mount batch has gone idle. */
const MEDIA_START_DELAY_MS = 400;

/** How long the next clip waits so it does not compete with the current one. */
const NEXT_VIDEO_PRELOAD_DELAY_MS = 1500;

export type UseOnboardingMediaResult = {
  player: VideoPlayer;
};

/**
 * The looping background player for the onboarding carousel.
 *
 * Startup is deliberately deferred, and each clip is pulled into the local
 * cache before it is played.
 */
export function useOnboardingMedia(activeIndex: number): UseOnboardingMediaResult {
  const [cachedSources, setCachedSources] = useState<Record<number, string>>({});
  const prevIndexRef = useRef<number>(0);

  // تشغيل الوسائط (تحميل الفيديوهات + البثّ + تهيئة المُفكِّك) يُؤجَّل حتى تنتهي
  // أول دفعة mount. البدء بها في نفس الـ commit الذي يبني قائمة الشرائح الأفقية
  // (ReactHorizontalScrollView) كان يُجهد خيط الواجهة على الأجهزة الضعيفة ويُنتج
  // ANR داخل دفعة Fabric mount (راجع أثر الأعطال). انتظار خيط JS وحده لا يكفي لأن
  // دفعة الـ mount تعمل على خيط واجهة أندرويد، لذا ننتظر خمول التفاعلات ثم تأخيراً
  // قصيراً إضافياً.
  const [mediaReady, setMediaReady] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const task = runAfterInteractions(() => {
      timer = setTimeout(() => setMediaReady(true), MEDIA_START_DELAY_MS);
    });
    return () => {
      task.cancel();
      if (timer) clearTimeout(timer);
    };
  }, []);

  // تحميل الفيديو الحالي محلياً أولاً ثم تشغيله من القرص (بدون انتظار الشبكة)
  useEffect(() => {
    if (!mediaReady) return;
    let cancelled = false;
    const url = SLIDE_VIDEOS[activeIndex];
    if (!url) return;
    cacheVideo(url).then((localUri) => {
      if (!cancelled) {
        setCachedSources((prev) =>
          prev[activeIndex] === localUri ? prev : { ...prev, [activeIndex]: localUri },
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeIndex, mediaReady]);

  // تحميل الفيديو التالي في الخلفية ليكون جاهزاً عند التمرير. يتأخر قليلاً كي
  // لا يتنافس مع بثّ/تحميل الفيديو الحالي على الأجهزة البطيئة.
  useEffect(() => {
    if (!mediaReady) return;
    const next = activeIndex + 1;
    const nextUrl = SLIDE_VIDEOS[next];
    if (!nextUrl) return;
    const timer = setTimeout(() => preloadVideos([nextUrl]), NEXT_VIDEO_PRELOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [activeIndex, mediaReady]);

  const initPlayer = useCallback((player: VideoPlayer): void => {
    player.loop = true;
    player.muted = true;
    player.play();
  }, []);

  const player = useVideoPlayer(
    mediaReady ? (cachedSources[activeIndex] ?? SLIDE_VIDEOS[activeIndex]!) : null,
    initPlayer,
  );

  // عند تغيير الـ slide استبدل الـ source: محلي من الكاش إن وُجد، وإلا من الرابط
  useEffect(() => {
    if (!mediaReady) return;
    if (prevIndexRef.current === activeIndex) return;
    prevIndexRef.current = activeIndex;
    player.replace(cachedSources[activeIndex] ?? SLIDE_VIDEOS[activeIndex]!);
    player.loop = true;
    player.muted = true;
    player.play();
  }, [activeIndex, player, cachedSources, mediaReady]);

  return { player };
}
