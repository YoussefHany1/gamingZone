import React, { memo } from "react";
import { View } from "react-native";
import CustomText from "./CustomText";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

interface SectionTitleProps {
  title: string;
  fontSize?: number;
  subtitle?: string;
}

const SectionTitle = memo<SectionTitleProps>(({ title, fontSize = 18, subtitle }) => {
  const styles = useThemeStyles((c) => ({
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 14,
    },
    sectionAccent: {
      width: 4,
      height: 20,
      borderRadius: 2,
      backgroundColor: c.accentText,
    },
    textContainer: {
      justifyContent: "center",
    },
    sectionTitle: {
      color: c.text,
      fontWeight: "bold",
    },
    sectionSubtitle: {
      color: c.textMuted,
      fontSize: 13,
    },
  }));

  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionAccent, subtitle ? { height: 35 } : undefined]} />
      <View style={styles.textContainer}>
        <CustomText style={[styles.sectionTitle, { fontSize }]}>{title}</CustomText>
        {subtitle ? (
          <CustomText style={styles.sectionSubtitle}>{subtitle}</CustomText>
        ) : null}
      </View>
    </View>
  );
});
SectionTitle.displayName = "SectionTitle";
export default SectionTitle;
