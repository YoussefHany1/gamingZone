import React, { memo } from "react";
import { View } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useTranslation } from "react-i18next";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

export type AuthDividerProps = {
  /** Optional override; defaults to the "Or continue with" locale string. */
  label?: string;
};

/** Hairline separator with a centred label ("Or continue with"). */
const AuthDivider: React.FC<AuthDividerProps> = ({ label }) => {
  const { t } = useTranslation();

  const styles = useThemeStyles((c) => ({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginVertical: 16,
    },
    line: { flex: 1, height: 1, backgroundColor: c.accentBorder },
    label: { color: c.textSubtle, fontSize: 13 },
  }));

  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <CustomText style={styles.label}>
        {label ?? t("auth.validation.orContinueWith")}
      </CustomText>
      <View style={styles.line} />
    </View>
  );
};

export default memo(AuthDivider);
