export interface Article {
  $id: string;
  title: string;
  thumbnail?: string;
  siteName: string;
  pubDate: string;
  category: string;
  language?: string;
  link?: string;
  description?: string;
  url?: string;
}

export interface WeeklySummaryDoc {
  $id: string;
  $createdAt: string;
  summary_ar?: string;
  summary_en?: string;
}

export interface GamingEvent {
  id: number;
  name: string;
  event_logo?: { image_id: string };
  start_time: number;
  end_time: number;
  live_stream_url?: string;
  description?: string;
  event_networks?: { network_type: number; url: string }[];
  videos?: { video_id: string; name: string }[];
  games?: { id: number; name: string; cover?: { image_id: string } }[];
}
