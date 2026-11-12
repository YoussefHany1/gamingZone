import React, { memo } from "react";
import { TouchableOpacity, View } from "react-native";
import CustomText from "@/src/components/CustomText";
import { useTranslation } from "react-i18next";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";

export type AuthEmailSuggestionsProps = {
  /** Domains to render as one-tap chips. */
  domains: readonly string[];
  /** Called with the chosen domain, e.g. `gmail.com`. */
  onSelect: (domain: string) => void;
};

/**
 * Chips that complete the email domain in a single tap.
 *
 * Mobile keyboards make typing `@gmail.com` tedious and error-prone, so the
 * most common providers are offered right below the field while the user is
 * typing. The row wraps and mirrors automatically in RTL layouts.
 */
const AuthEmailSuggestions: React.FC<AuthEmailSuggestionsProps> = ({
  domains,
  onSelect,
}) => {
  const { t } = useTranslation();
  const styles = useThemeStyles((c) => ({
    container: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 10,
    },
    chip: {
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: c.surface,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    chipText: {
      color: c.accentText,
      fontSize: 13,
      // Domains are always Latin text, even inside an RTL screen.
      writingDirection: "ltr",
      textAlign: "left",
    },
  }));

  if (domains.length === 0) return null;

  return (
    <View
      style={styles.container}
      accessibilityLabel={t("auth.emailSuggestions.label")}
    >
      {domains.map((domain) => (
        <TouchableOpacity
          key={domain}
          style={styles.chip}
          onPress={() => onSelect(domain)}
          accessibilityRole="button"
          accessibilityLabel={t("auth.emailSuggestions.useDomain", { domain })}
          accessibilityHint={t("auth.emailSuggestions.useDomainHint")}
        >
          <CustomText style={styles.chipText}>@{domain}</CustomText>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default memo(AuthEmailSuggestions);
