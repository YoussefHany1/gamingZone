import React, { memo, useCallback } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import CustomText from "@/src/components/CustomText";
import { Globe } from "lucide-react-native";
import {
  DiscordIcon,
  FacebookIcon,
  InstagramIcon,
  TwitchIcon,
  XIcon,
  YouTubeIcon,
} from "@/src/components/icons/BrandIcons";
import { openLink } from "@/src/lib/browser";
import type { NetworkButtonProps } from "../types";
import type { ComponentType } from "react";

type NetworkIcon = ComponentType<{ fill?: string; size?: number }>;

// Maps IGDB event_network enum to icon names
const NETWORK_ICONS: Record<number, { icon: NetworkIcon; color: string; label: string }> = {
  1: { icon: XIcon, color: "#fff", label: "X" },
  2: { icon: InstagramIcon, color: "#E1306C", label: "Instagram" },
  3: { icon: YouTubeIcon, color: "#FF0000", label: "YouTube" },
  4: { icon: TwitchIcon, color: "#9146FF", label: "Twitch" },
  5: { icon: DiscordIcon, color: "#5865F2", label: "Discord" },
  6: { icon: FacebookIcon, color: "#1877F2", label: "Facebook" },
  7: { icon: Globe, color: "#779bdd", label: "Website" },
};

const NetworkButton = memo<NetworkButtonProps>(({ network }) => {
  const info = NETWORK_ICONS[network.network_type] ?? {
    icon: Globe,
    color: "#779bdd",
    label: "Link",
  };

  const handlePress = useCallback(() => {
    openLink(network.url);
  }, [network.url]);

  return (
    <TouchableOpacity
      style={[styles.networkBtn, { borderColor: info.color + "60" }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <info.icon size={22} fill={info.color} />
      <CustomText style={[styles.networkLabel, { color: info.color }]}>
        {info.label}
      </CustomText>
    </TouchableOpacity>
  );
});
NetworkButton.displayName = "NetworkButton";
export default NetworkButton;

const styles = StyleSheet.create({
  networkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(81, 105, 150, 0.2)",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  networkLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
});
