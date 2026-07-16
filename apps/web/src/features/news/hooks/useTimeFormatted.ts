import { useEffect, useState } from "react";
import { useLangStore } from "@/store/useLangStore";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  let formatted = "";
  if (mounted) {
    if (format === "date") {
      formatted = new Date(dateStr).toLocaleDateString(
        lang === "ar" ? "ar-EG" : "en-US",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        },
      );
    } else {
      formatted = getTimeAgo(dateStr, lang);
    }
  }

  return { formatted, mounted };
}
