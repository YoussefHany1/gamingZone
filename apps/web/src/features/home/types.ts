import { Article, WeeklySummaryDoc } from "@/types";

export interface LatestNewsFeedProps {
  category: "news" | "reviews" | "esports" | "hardware";
  initialArticles?: Article[];
  locale?: string;
}

export interface SlideshowVideo {
  video_id: string;
  name: string;
}

export interface SlideshowGame {
  id: number;
  name: string;
  cover?: { image_id: string };
  screenshots?: { image_id: string }[];
  videos?: SlideshowVideo[];
}

export interface WeeklyRecapProps {
  initialSummary?: WeeklySummaryDoc | null;
}
