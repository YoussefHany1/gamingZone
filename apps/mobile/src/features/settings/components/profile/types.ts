import type { ComponentType } from "react";
import type { GameEntry } from "@/src/features/lists/types";
import type { ProfileStatus } from "@gaming-zone/core";
import type { UserStats } from "../../hooks/useUserStats";

export type StatTileProps = {
  icon: ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: string;
  /** Playtime spans the grid rather than sitting in one of its two columns. */
  wide?: boolean;
};

export type RateCardProps = {
  entry: GameEntry;
};

export type ProfileHeaderCardProps = {
  displayName: string;
  photoURL: string;
  memberSince: string | null;
  platform: string;
  country: string;
  handle: string;
  bannerURL: string;
  bio: string;
  status: ProfileStatus | null;
  onEditProfile?: () => void;
};

export type ProfileStatsGridProps = {
  stats: UserStats | null;
};

export type ProfileEmptyLibraryCardProps = {
  onBrowse: () => void;
};

export type ProfileActionsProps = {
  onEditProfile: () => void;
  onMyLists: () => void;
};

export type ProfileMenuProps = {
  onPublicProfile: () => void;
  onMyLists: () => void;
  onPcSpecs: () => void;
  onConnectedApps: () => void;
};

export type ProfileMenuItemProps = {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  onPress: () => void;
  showDivider?: boolean;
};
