import React, { useState, useCallback, memo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ToastAndroid,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ID } from "react-native-appwrite";
import { databases } from "../lib/appwrite";
import auth from "@react-native-firebase/auth";
import COLORS from "../constants/colors";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

// Types

type IoniconName = ComponentProps<typeof Ionicons>["name"];
type FeedbackType = "suggestion" | "problem" | "other";
type RootStackParamList = { ContactScreen: undefined };
type Props = NativeStackScreenProps<RootStackParamList, "ContactScreen">;

// Constants
const DATABASE_ID = "6930389a0033ba85bfe1" as const;
const COLLECTION_ID = "contact" as const;
const MAX_MESSAGE_LENGTH = 5000 as const;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface TypeButtonProps {
  value: FeedbackType;
  icon: IoniconName;
  label: string;
  active: boolean;
  onPress: (value: FeedbackType) => void;
}

const TypeButton = memo<TypeButtonProps>(({ value, icon, label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.typeButton, active && styles.typeButtonActive]}
    onPress={() => onPress(value)}
  >
    <Ionicons name={icon} size={24} color="#fff" />
    <Text style={[styles.typeText, active && styles.typeTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
));
TypeButton.displayName = "TypeButton";

// main
const ContactScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const currentUser = auth().currentUser;

  const [type, setType] = useState<FeedbackType>("suggestion");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [email, setEmail] = useState<string>(currentUser?.email ?? "");

  // Validation
  const isValidEmail = useCallback((addr: string): boolean =>
    EMAIL_REGEX.test(addr), []);

  // Handlers
  const handleTypePress = useCallback((value: FeedbackType) => {
    setType(value);
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

    setLoading(true);
    try {
      await databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
        type,
        message,
        email,
        userId: currentUser?.uid ?? null,
      });
      ToastAndroid.show(t("settings.contact.success"), ToastAndroid.LONG);
      navigation.goBack();
    } catch (error) {
      console.error("[ContactScreen] Error sending feedback:", error);
      ToastAndroid.show(t("settings.contact.error"), ToastAndroid.LONG);
    } finally {
      setLoading(false);
    }
  }, [message, email, type, currentUser, isValidEmail, t, navigation]);

  // Render

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Feedback type selection */}
        <Text style={styles.label}>{t("settings.contact.typeLabel")}</Text>
        <View style={styles.typesContainer}>
          <TypeButton
            value="suggestion"
            icon="bulb-outline"
            label={t("settings.contact.types.suggestion")}
            active={type === "suggestion"}
            onPress={handleTypePress}
          />
          <TypeButton
            value="problem"
            icon="warning-outline"
            label={t("settings.contact.types.problem")}
            active={type === "problem"}
            onPress={handleTypePress}
          />
          <TypeButton
            value="other"
            icon="chatbubble-ellipses-outline"
            label={t("settings.contact.types.other")}
            active={type === "other"}
            onPress={handleTypePress}
          />
        </View>

        {/* Message input */}
        <Text style={styles.label}>{t("settings.contact.messageLabel")}</Text>
        <View style={styles.inputContainer}>
          <TextInput
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
          <Text
            style={[
              styles.charCount,
              message.length === MAX_MESSAGE_LENGTH && styles.charCountLimit,
            ]}
          >
            {message.length} / {MAX_MESSAGE_LENGTH}
          </Text>
        </View>

        {/* Email input */}
        <Text style={styles.label}>{t("settings.contact.emailLabel")}</Text>
        <View style={styles.inputContainer}>
          <TextInput
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
            <Text style={styles.submitText}>{t("settings.contact.send")}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ContactScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
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