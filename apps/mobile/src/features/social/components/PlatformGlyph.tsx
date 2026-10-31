import React from "react";
import {
  DiscordIcon,
  PlayStationIcon,
  XboxIcon,
} from "@/src/components/icons/BrandIcons";
import { SteamIcon } from "@/src/components/icons/StoreIcons";

/**
 * The four platforms the profile knows about. `PublicProfile.platform` and
 * `ProfileLink.platform` use different spellings for PlayStation, so both are
 * folded into the same canonical name here instead of in every card.
 */
type CanonicalPlatform = "steam" | "playstation" | "xbox" | "discord";

const CANONICAL_PLATFORMS: Record<string, CanonicalPlatform> = {
  steam: "steam",
  psn: "playstation",
  playstation: "playstation",
  xbox: "xbox",
  discord: "discord",
};

export type PlatformGlyphProps = {
  platform: string | null | undefined;
  color: string;
  size?: number;
  /** The linked-accounts card historically renders Discord for unknown values. */
  unknownAsDiscord?: boolean;
};

export default function PlatformGlyph({
  platform,
  color,
  size = 16,
  unknownAsDiscord = false,
}: PlatformGlyphProps): React.ReactElement | null {
  const canonical = platform ? CANONICAL_PLATFORMS[platform.toLowerCase()] : undefined;

  switch (canonical) {
    case "steam":
      return <SteamIcon size={size} fill={color} />;
    case "playstation":
      return <PlayStationIcon size={size} fill={color} />;
    case "xbox":
      return <XboxIcon size={size} fill={color} />;
    case "discord":
      return <DiscordIcon size={size} fill={color} />;
    default:
      return unknownAsDiscord ? <DiscordIcon size={size} fill={color} /> : null;
  }
}
