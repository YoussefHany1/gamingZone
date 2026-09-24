import { useSyncExternalStore } from "react";
import { useLangStore } from "@/store/useLangStore";

const noopSubscribe = () => () => {};

/**
 * Returns true only after hydration on the client, so time-sensitive output
 * never mismatches the server-rendered HTML.
 */
function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

function getTimeAgo(dateStr: string, lang: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
    numeric: "auto",
  });

  let interval = seconds / 31536000;
  if (interval >= 1) return rtf.format(-Math.floor(interval), "year");
  interval = seconds / 2592000;
  if (interval >= 1) return rtf.format(-Math.floor(interval), "month");
  interval = seconds / 86400;
  if (interval >= 1) return rtf.format(-Math.floor(interval), "day");
  interval = seconds / 3600;
  if (interval >= 1) return rtf.format(-Math.floor(interval), "hour");
  interval = seconds / 60;
  if (interval >= 1) return rtf.format(-Math.floor(interval), "minute");

  return rtf.format(-Math.floor(seconds || 1), "second");
}

export function useTimeFormatted(dateStr: string, format: "timeAgo" | "date" = "timeAgo") {
  const { lang } = useLangStore();
  const mounted = useMounted();

  const formatted = mounted
    ? format === "date"
      ? new Date(dateStr).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : getTimeAgo(dateStr, lang)
    : "";

  return { formatted, mounted };
}
