import React, { memo, useCallback } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import CustomText from "@/src/components/CustomText";
import { Ionicons } from "@expo/vector-icons";
import { openLink } from "@/src/lib/browser";
import type { NetworkButtonProps } from "../types";

// Maps IGDB event_network enum to icon names
const NETWORK_ICONS: Record<number, { icon: string; color: string; label: string }> = {
  1: { icon: "logo-x", color: "#fff", label: "X" },
  2: { icon: "logo-instagram", color: "#E1306C", label: "Instagram" },
  3: { icon: "logo-youtube", color: "#FF0000", label: "YouTube" },
  4: { icon: "logo-twitch", color: "#9146FF", label: "Twitch" },
  5: { icon: "logo-discord", color: "#5865F2", label: "Discord" },
  6: { icon: "logo-facebook", color: "#1877F2", label: "Facebook" },
  7: { icon: "globe-outline", color: "#779bdd", label: "Website" },
};

const NetworkButton = memo<NetworkButtonProps>(({ network }) => {
  const info = NETWORK_ICONS[network.network_type] ?? {
    icon: "globe-outline",
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
      <Ionicons name={info.icon as any} size={22} color={info.color} />
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
