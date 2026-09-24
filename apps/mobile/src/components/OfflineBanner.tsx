import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import CustomText from "./CustomText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { WifiOff } from "lucide-react-native";
import { useNetworkStatus } from "@/src/hooks/useNetworkStatus";

const OfflineBanner = memo(() => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isOffline = useNetworkStatus();

  if (!isOffline) return null;

  return (
    <View pointerEvents="none" style={[styles.wrapper, { top: insets.top }]}>
      <WifiOff size={14} color="#ffd27f" style={styles.icon} />
      <CustomText style={styles.text}>{t("common.offlineBanner")}</CustomText>
    </View>
  );
});

OfflineBanner.displayName = "OfflineBanner";
export default OfflineBanner;

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: "rgba(60, 48, 10, 0.92)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    color: "#ffd27f",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});