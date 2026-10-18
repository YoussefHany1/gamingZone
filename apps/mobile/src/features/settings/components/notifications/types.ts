import type { LucideIcon } from "lucide-react-native";
import type { RssSource } from "@/src/hooks/useRssFeeds";
import type { NotificationPreferences } from "@/src/services/notificationService";

export type NotificationCategorySectionProps = {
  category: string;
  title: string;
  sources: RssSource[];
  preferences: NotificationPreferences;
  isExpanded: boolean;
  onToggleExpansion: (category: string) => void;
  onToggleSource: (category: string, sourceName: string) => Promise<void>;
};

export type AlertToggleCardProps = {
  icon: LucideIcon;
  title: string;
  enabled: boolean;
  onToggle: () => void;
};
