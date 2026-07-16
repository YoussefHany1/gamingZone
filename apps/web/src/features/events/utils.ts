export function formatEventDate(timestamp: number) {
  if (!timestamp) return "";
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getEventStatus(startTime: number, endTime: number): "upcoming" | "live" | "ended" {
  const now = Date.now() / 1000;
  if (now < startTime) return "upcoming";
  if (now >= startTime && now <= endTime) return "live";
  return "ended";
}
