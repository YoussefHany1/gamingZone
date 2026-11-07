import React from "react";
import { Monitor } from "lucide-react-native";
import {
  AndroidIcon,
  AppleIcon,
  DiscordIcon,
  PlayStationIcon,
  XboxIcon,
} from "@/src/components/icons/BrandIcons";
import { NintendoSwitchIcon, SteamIcon } from "@/src/components/icons/StoreIcons";

/**
 * The canonical platform→glyph mapping. Platform ids use assorted spellings
 * across the app (`pc`, `psn`, `playstation`, linked `steam`/`xbox`), so every
 * spelling is folded into one component instead of per-card switch statements.
 */
export type PlatformGlyphProps = {
  platform: string | null | undefined;
  color: string;
  size?: number;
  /** Legacy fallback: renders Discord for unknown values. */
  unknownAsDiscord?: boolean;
};

export default function PlatformGlyph({
  platform,
  color,
  size = 16,
  unknownAsDiscord = false,
}: PlatformGlyphProps): React.ReactElement | null {
  const key = platform?.trim().toLowerCase() ?? "";
  if (!key) return null;

  switch (key) {
    case "pc":
      return <Monitor size={size} color={color} />;
    case "steam":
      return <SteamIcon size={size} fill={color} />;
    case "playstation":
    case "psn":
      return <PlayStationIcon size={size} fill={color} />;
    case "xbox":
      return <XboxIcon size={size} fill={color} />;
    case "nintendo":
      return <NintendoSwitchIcon size={size} fill={color} />;
    case "android":
      return <AndroidIcon size={size} fill={color} />;
    case "ios":
      return <AppleIcon size={size} fill={color} />;
    case "discord":
      return <DiscordIcon size={size} fill={color} />;
    default:
      return unknownAsDiscord ? <DiscordIcon size={size} fill={color} /> : null;
  }
}
