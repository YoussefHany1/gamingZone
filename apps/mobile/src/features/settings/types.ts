import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { LucideIcon } from "lucide-react-native";

export type FirestoreUser = {
  displayName?: string;
  photoURL?: string;
  dob?: string;
  gender?: string;
  country?: string;
  platform?: string;
  isAdmin?: boolean;
};

export type CloudinaryResponse = {
  secure_url?: string;
  [key: string]: unknown;
};

export type IoniconName = LucideIcon;

export type MenuItem = {
  id: string;
  icon?: IoniconName;
  label?: string;
  onPress?: () => void;
  component?: React.ComponentType;
};

export type SettingsNavProp = NativeStackNavigationProp<
  Record<string, object | undefined>
>;

export type Props = {
  visible: boolean;
  onClose: () => void;
};

export type SteamGame = {
  appid: number;
  name: string;
  playtime_forever: number;
  playtime_2weeks?: number;
  img_icon_url: string;
};

export type IgdbGame = {
  id: number;
  steam_appid: number;
  name: string;
  cover_image_id: string | null;
  release_date: string;
};

export type SteamWishlistResponse = {
  appIds?: number[];
};

/** Platforms the user can link for library auto-imports. */
export type LinkedAccountPlatform = "steam" | "psn" | "xbox";

/** Backend-driven lifecycle state shown in Settings (never a toast). */
export type LinkedAccountStatus = "active" | "reauth_required" | "unlinked";

export type LinkedAccount = {
  platform: LinkedAccountPlatform;
  status?: LinkedAccountStatus;
  /** Steam only — 64-bit SteamID. */
  steamId?: string;
  /** PSN only — account identifiers for display. */
  accountId?: string;
  onlineId?: string;
  /** Xbox only — the numeric Xbox user id (xuid). */
  xuid?: string;
  /** Xbox only — the gamertag, for display only. */
  gamertag?: string;
  linkedAt?: number; // ms epoch (converted from Firestore Timestamp)
  lastSyncedAt?: number | null;
};

export type LinkStateResponse = {
  state: string;
  /** Where to send the user: Steam's OpenID login, Sony's ssocookie JSON page
   * or our own `/xbox/authorize` handshake (Microsoft OAuth v2.0). */
  startUrl: string;
};

export type PsnSyncResponse =
  | {
      status: "ok";
      titles: Array<{
        titleId: string | null;
        name: string;
        imageUrl: string | null;
        category: string | null;
        lastPlayedDateTime: string | null;
        playCount: number;
      }>;
    }
  | { status: "reauth_required" | "error" };

/**
 * Xbox has no purchase history for modern titles — the backend returns the
 * recently played titles plus the achievement titles that show real progress.
 * `source` tells the client which of the two a title came from.
 */
export type XboxSyncResponse =
  | {
      status: "ok";
      titles: Array<{
        titleId: string | null;
        modernTitleId: string | null;
        name: string;
        source: "recent" | "achievements";
        lastPlayedDateTime: string | null;
      }>;
    }
  | { status: "reauth_required" | "error" };

export type IgdbNameMapResult = {
  title: string;
  game: {
    id: number;
    name: string;
    cover_image_id: string | null;
    release_date: string;
  } | null;
};

export type IgdbNameMapResponse = {
  results: IgdbNameMapResult[];
};

/** The kind of feedback a user can submit from the contact screen. */
export type FeedbackType = "suggestion" | "problem" | "other";
