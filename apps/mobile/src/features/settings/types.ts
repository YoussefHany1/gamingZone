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
