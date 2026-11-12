import { forwardRef, memo, useCallback, useMemo, useState } from "react";
import { View, type TextInput, type TextInputProps } from "react-native";
import { Mail } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import AuthEmailSuggestions from "./AuthEmailSuggestions";
import AuthInput, { type AuthInputProps } from "./AuthInput";
import { applyEmailDomain, getEmailDomainSuggestions } from "../lib/emailSuggestions";

export type AuthEmailInputProps = Omit<
  AuthInputProps,
  | "icon"
  | "keyboardType"
  | "autoCapitalize"
  | "autoCorrect"
  | "autoComplete"
  | "textContentType"
  | "value"
  | "onChangeText"
> & {
  value: string;
  onChangeText: (value: string) => void;
  /** Android autofill hint; `username` lets credential managers fill it in. */
  autoComplete?: TextInputProps["autoComplete"];
  /** iOS Keychain hint; use `username` on the sign-in form. */
  textContentType?: TextInputProps["textContentType"];
  /** Set `false` to render a plain email field without domain chips. */
  showDomainSuggestions?: boolean;
};

/**
 * Email field with platform autofill hints and one-tap domain chips.
 *
 * The suggestions only appear while the field is focused and the domain is
 * still incomplete, so they never cover the rest of the form permanently.
 */
const AuthEmailInput = memo(
  forwardRef<TextInput, AuthEmailInputProps>(function AuthEmailInput(
    {
      value,
      onChangeText,
      onFocus,
      onBlur,
      showDomainSuggestions = true,
      autoComplete = "email",
      textContentType = "emailAddress",
      accessibilityLabel,
      accessibilityHint,
      containerStyle,
      ...props
    },
    ref,
  ) {
    const { t } = useTranslation();
    const [focused, setFocused] = useState(false);

    const styles = useThemeStyles(() => ({
      suggestions: { marginTop: -6 },
    }));

    const domains = useMemo(
      () => (showDomainSuggestions ? getEmailDomainSuggestions(value) : []),
      [showDomainSuggestions, value],
    );

    const handleFocus = useCallback<NonNullable<TextInputProps["onFocus"]>>(
      (event) => {
        setFocused(true);
        onFocus?.(event);
      },
      [onFocus],
    );

    const handleBlur = useCallback<NonNullable<TextInputProps["onBlur"]>>(
      (event) => {
        setFocused(false);
        onBlur?.(event);
      },
      [onBlur],
    );

    const handleSelectDomain = useCallback(
      (domain: string) => {
        onChangeText(applyEmailDomain(value, domain));
      },
      [onChangeText, value],
    );

    return (
      <>
        <AuthInput
          ref={ref}
          {...props}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          icon={Mail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          textContentType={textContentType}
          accessibilityLabel={accessibilityLabel ?? t("auth.a11y.emailLabel")}
          accessibilityHint={accessibilityHint ?? t("auth.a11y.emailHint")}
          containerStyle={containerStyle}
        />

        {focused && domains.length > 0 ? (
          <View style={styles.suggestions}>
            <AuthEmailSuggestions domains={domains} onSelect={handleSelectDomain} />
          </View>
        ) : null}
      </>
    );
  }),
);

AuthEmailInput.displayName = "AuthEmailInput";

export default AuthEmailInput;
