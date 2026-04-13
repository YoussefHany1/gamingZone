import React, { memo, useCallback } from "react";
import { Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { GamingEventNetwork } from "../types";

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

interface NetworkButtonProps { network: GamingEventNetwork }
const NetworkButton = memo<NetworkButtonProps>(({ network }) => {
  const info = NETWORK_ICONS[network.network_type] ?? {
    icon: "globe-outline",
    color: "#779bdd",
    label: "Link",
  };

  const handlePress = useCallback(() => {
    Linking.openURL(network.url).catch(() => console.error("Failed to open link"));
  }, [network.url]);

  return (
    <TouchableOpacity style={[styles.networkBtn, { borderColor: info.color + "60" }]} onPress={handlePress} activeOpacity={0.8}>
      <Ionicons name={info.icon as any} size={22} color={info.color} />
      <Text style={[styles.networkLabel, { color: info.color }]}>{info.label}</Text>
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
