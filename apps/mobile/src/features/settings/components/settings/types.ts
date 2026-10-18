import type { MenuItem } from "../../types";

export type SettingsUserCardProps = {
  /** The account's display name; null falls back to the guest label. */
  displayName: string | null;
  photoURL: string | null;
  /** Anonymous sessions get the anonymous avatar and no trailing chevron. */
  isGuest: boolean;
  /** True while the app renders right-to-left. */
  isRtl: boolean;
  onPress: () => void;
};

export type SettingsMenuListProps = {
  items: MenuItem[];
  isRtl: boolean;
};

export type SettingsSignOutButtonProps = {
  label: string;
  onPress: () => void;
};
