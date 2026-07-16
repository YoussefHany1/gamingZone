"use client";

import { TimeAgoClientProps } from "../types";
import { useTimeFormatted } from "../hooks/useTimeFormatted";

export default function TimeAgoClient({
  dateStr,
  format = "timeAgo",
}: TimeAgoClientProps) {
  const { formatted, mounted } = useTimeFormatted(dateStr, format);

  if (!mounted) {
    return null;
  }

  return <span>{formatted}</span>;
}
