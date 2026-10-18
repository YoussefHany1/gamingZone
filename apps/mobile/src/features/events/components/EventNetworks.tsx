import React, { memo } from "react";
import { View } from "react-native";
import SectionTitle from "@/src/components/SectionTitle";
import { useTranslation } from "react-i18next";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import NetworkButton from "./NetworkButton";
import type { EventNetworksProps } from "../types";

/** "Links & Social" section. */
const EventNetworks: React.FC<EventNetworksProps> = ({ networks }) => {
  const { t } = useTranslation();
  const styles = useThemeStyles(() => ({
    section: { marginTop: 24 },
    networksWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
  }));

  return (
    <View style={styles.section}>
      <SectionTitle title={t("events.links") || "Links & Social"} />
      <View style={styles.networksWrap}>
        {networks.map((net, i) => (
          <NetworkButton key={i} network={net} />
        ))}
      </View>
    </View>
  );
};

export default memo(EventNetworks);
