import React, { useState, useCallback, memo } from "react";
import { storage } from "@/src/lib/storage";
import CustomText from "@/src/components/CustomText";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ToastAndroid,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import auth from "@react-native-firebase/auth";
import COLORS from "@/src/constants/colors";
import { useTranslation } from "react-i18next";
import { Lightbulb, MessageSquare, TriangleAlert } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import CustomTextInput from "@/src/components/CustomTextInput";

// Types

type IoniconName = LucideIcon;
type FeedbackType = "suggestion" | "problem" | "other";
type RootStackParamList = { ContactScreen: undefined };
type Props = NativeStackScreenProps<RootStackParamList, "ContactScreen">;

// EmailJS Config
const EMAILJS_SERVICE_ID = (process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID ?? "").replace(
  /^"|"$/g,
  "",
);
const EMAILJS_TEMPLATE_ID = (process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID ?? "").replace(
  /^"|"$/g,
  "",
);
const EMAILJS_PUBLIC_KEY = (process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY ?? "").replace(
  /^"|"$/g,
  "",
);

// Other constants
const MAX_MESSAGE_LENGTH = 5000 as const;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGES_PER_HOUR = 5 as const;
const RATE_LIMIT_KEY = "contact_rate_limit_timestamps" as const;
const ONE_HOUR_MS = 3_600_000 as const; // 1 hour in milliseconds

interface TypeButtonProps {
  value: FeedbackType;
  icon: IoniconName;
  label: string;
  active: boolean;
  onPress: (value: FeedbackType) => void;
}

const TypeButton = memo<TypeButtonProps>(
  ({ value, icon: Icon, label, active, onPress }) => (
    <TouchableOpacity
      style={[styles.typeButton, active && styles.typeButtonActive]}
      onPress={() => onPress(value)}
    >
      <Icon size={24} color="#fff" />
      <CustomText style={[styles.typeText, active && styles.typeTextActive]}>
        {label}
      </CustomText>
    </TouchableOpacity>
  ),
);
TypeButton.displayName = "TypeButton";

// main
const ContactScreen = ({ navigation }: Props) => {
  const { t } = useTranslation();
  const currentUser = auth().currentUser;

  const [type, setType] = useState<FeedbackType>("suggestion");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [email, setEmail] = useState<string>(currentUser?.email ?? "");

  // Validation
  const isValidEmail = useCallback((addr: string): boolean => EMAIL_REGEX.test(addr), []);

  // Handlers
  const handleTypePress = useCallback((value: FeedbackType) => {
    setType(value);
  }, []);

  // Rate limiting helpers — synchronous MMKV reads
  const getRateLimitTimestamps = useCallback((): number[] => {
    try {
      const raw = storage.getString(RATE_LIMIT_KEY);
      if (!raw) return [];
      const all: number[] = JSON.parse(raw);
      const now = Date.now();
      // Keep only timestamps within the last hour
      return all.filter((ts) => now - ts < ONE_HOUR_MS);
    } catch {
      return [];
    }
  }, []);

  const saveRateLimitTimestamp = useCallback((timestamps: number[]): void => {
    try {
      storage.set(RATE_LIMIT_KEY, JSON.stringify([...timestamps, Date.now()]));
    } catch {
      // silently fail — don't block the user on storage errors
    }
  }, []);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!message.trim()) {
      ToastAndroid.show(t("settings.contact.messageError"), ToastAndroid.LONG);
      return;
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      ToastAndroid.show(t("settings.contact.messageTooLong"), ToastAndroid.LONG);
      return;
    }
    if (email.trim() && !isValidEmail(email)) {
      ToastAndroid.show(t("settings.contact.invalidEmail"), ToastAndroid.LONG);
      return;
    }

    // Rate limit check — synchronous now
    const recentTimestamps = getRateLimitTimestamps();
    if (recentTimestamps.length >= MAX_MESSAGES_PER_HOUR) {
      ToastAndroid.show(t("settings.contact.rateLimitError"), ToastAndroid.LONG);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: {
            feedback_type: type,
            message,
            from_email: email || "(not provided)",
            user_id: currentUser?.uid ?? "anonymous",
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`EmailJS HTTP Error: ${response.status} ${errorText}`);
      }

      saveRateLimitTimestamp(recentTimestamps);
      ToastAndroid.show(t("settings.contact.success"), ToastAndroid.LONG);
      navigation.goBack();
    } catch (error) {
      console.error("[ContactScreen] Error sending email:", error);
      ToastAndroid.show(t("settings.contact.error"), ToastAndroid.LONG);
    } finally {
      setLoading(false);
    }
  }, [
    message,
    email,
    type,
    currentUser,
    isValidEmail,
    getRateLimitTimestamps,
    saveRateLimitTimestamp,
    t,
    navigation,
  ]);

  // Render

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Feedback type selection */}
        <CustomText style={styles.label}>{t("settings.contact.typeLabel")}</CustomText>
        <View style={styles.typesContainer}>
          <TypeButton
            value="suggestion"
            icon={Lightbulb}
            label={t("settings.contact.types.suggestion")}
            active={type === "suggestion"}
            onPress={handleTypePress}
          />
          <TypeButton
            value="problem"
            icon={TriangleAlert}
            label={t("settings.contact.types.problem")}
            active={type === "problem"}
            onPress={handleTypePress}
          />
          <TypeButton
            value="other"
            icon={MessageSquare}
            label={t("settings.contact.types.other")}
            active={type === "other"}
            onPress={handleTypePress}
          />
        </View>

        {/* Message input */}
        <CustomText style={styles.label}>{t("settings.contact.messageLabel")}</CustomText>
        <View style={styles.inputContainer}>
          <CustomTextInput
            style={[styles.input, styles.textArea]}
            placeholder={t("settings.contact.messagePlaceholder")}
            placeholderTextColor="#999"
            multiline
            numberOfLines={6}
            value={message}
            onChangeText={setMessage}
            textAlignVertical="top"
            maxLength={MAX_MESSAGE_LENGTH}
          />
          <CustomText
            style={[
              styles.charCount,
              message.length === MAX_MESSAGE_LENGTH && styles.charCountLimit,
            ]}
          >
            {message.length} / {MAX_MESSAGE_LENGTH}
          </CustomText>
        </View>

        {/* Email input */}
        <CustomText style={styles.label}>{t("settings.contact.emailLabel")}</CustomText>
        <View style={styles.inputContainer}>
          <CustomTextInput
            style={[styles.input, styles.emailInput]}
            placeholder="example@email.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <CustomText style={styles.submitText}>
              {t("settings.contact.send")}
            </CustomText>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ContactScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary, paddingBottom: 90 },
  scrollContent: { padding: 20 },
  label: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 10,
    fontWeight: "bold",
    textAlign: "left",
  },
  typesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  typeButtonActive: {
    backgroundColor: COLORS.secondary,
    borderColor: "#779bdd",
  },
  typeText: {
    marginTop: 5,
    fontSize: 12,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  typeTextActive: { color: "#fff" },
  inputContainer: {
    backgroundColor: COLORS.secondary + "33",
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#779bdd",
  },
  input: { color: "#fff", padding: 15, fontSize: 16 },
  textArea: { minHeight: 120 },
  charCount: { color: "#779bdd", fontSize: 12, padding: 10, paddingBottom: 8 },
  charCountLimit: { color: "red" },
  emailInput: { textAlign: "left" },
  submitButton: {
    backgroundColor: COLORS.secondary,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  submitText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
