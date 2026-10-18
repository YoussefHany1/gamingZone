import React, { memo } from "react";
import { View } from "react-native";
import CustomText from "@/src/components/CustomText";
import SectionTitle from "@/src/components/SectionTitle";
import { useTranslation } from "react-i18next";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import type { EventDescriptionProps } from "../types";

/** "About" section with the event's description text. */
const EventDescription: React.FC<EventDescriptionProps> = ({ description }) => {
  const { t } = useTranslation();
  const styles = useThemeStyles((c) => ({
    section: { marginTop: 24 },
    description: {
      color: c.textMuted,
      fontSize: 15,
      lineHeight: 24,
      textAlign: "left" as const,
      direction: "ltr" as const,
    },
  }));

  return (
    <View style={styles.section}>
      <SectionTitle title={t("events.about") || "About"} />
      <CustomText style={styles.description}>{description}</CustomText>
    </View>
  );
};

export default memo(EventDescription);
