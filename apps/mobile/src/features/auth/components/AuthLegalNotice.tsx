import React, { memo, useCallback } from "react";
import { Linking, View } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useTranslation } from "react-i18next";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { PRIVACY_POLICY_URL } from "@/src/constants/config";

/**
 * Store-compliance notice shown at the bottom of the register screen:
 * "By creating an account, you agree to our <Privacy Policy>" with a
 * tappable link.
 */
const AuthLegalNotice: React.FC = () => {
  const { t } = useTranslation();

  const styles = useThemeStyles((c) => ({
    container: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      rowGap: 2,
      marginTop: 18,
      paddingHorizontal: 10,
    },
    notice: { color: c.textSubtle, fontSize: 12, textAlign: "center" },
    link: { color: c.accentText, fontSize: 12, textDecorationLine: "underline" },
  }));

  const openPrivacyPolicy = useCallback(() => {
    void Linking.openURL(PRIVACY_POLICY_URL);
  }, []);

  return (
    <View style={styles.container}>
      <CustomText style={styles.notice}>
        {t("auth.register.legalNotice")}{" "}
      </CustomText>
      <CustomText
        style={styles.link}
        onPress={openPrivacyPolicy}
        accessibilityRole="link"
        accessibilityLabel={t("auth.register.privacyPolicyLink")}
        accessibilityHint={t("auth.a11y.privacyPolicyHint")}
      >
        {t("auth.register.privacyPolicyLink")}
      </CustomText>
    </View>
  );
};

export default memo(AuthLegalNotice);
