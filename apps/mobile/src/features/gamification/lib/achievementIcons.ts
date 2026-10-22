import {
  Award,
  CheckCircle,
  Clock,
  Library,
  MessageSquare,
  Sparkles,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react-native";

/**
 * The badge icons, keyed by the `icon` field of an achievement definition.
 *
 * The catalog lives in `@gaming-zone/utils`, which cannot know about React
 * Native icon libraries, so it stores a key and the app resolves it here.
 * A key with no entry falls back to a star rather than rendering nothing.
 */
const ICONS: Record<string, LucideIcon> = {
  star: Star,
  messageSquare: MessageSquare,
  award: Award,
  sparkles: Sparkles,
  checkCircle: CheckCircle,
  library: Library,
  trophy: Trophy,
  clock: Clock,
};

export const achievementIcon = (key: string): LucideIcon => ICONS[key] ?? Star;
