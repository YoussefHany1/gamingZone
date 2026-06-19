"use client";

import React, { useEffect, useState } from "react";
import { useLangStore } from "../../store/useLangStore";

interface TimeAgoClientProps {
  dateStr: string;
  format?: "timeAgo" | "date";
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

export default function TimeAgoClient({ dateStr, format = "timeAgo" }: TimeAgoClientProps) {
  const { lang } = useLangStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (format === "date") {
    const dateText = new Date(dateStr).toLocaleDateString(
      lang === "ar" ? "ar-EG" : "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );
    return <span>{dateText}</span>;
  }

  return <span>{getTimeAgo(dateStr, lang)}</span>;
}
