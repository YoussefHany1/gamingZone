import React, { useCallback } from "react";
import { ScrollView, KeyboardAvoidingView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useThemeStyles } from "@/src/hooks/useThemeStyles";
import { useBottomInset } from "@/src/hooks/useBottomInset";
import ContactEmailField from "../components/contact/ContactEmailField";
import ContactSubmitButton from "../components/contact/ContactSubmitButton";
import FeedbackMessageField from "../components/contact/FeedbackMessageField";
import FeedbackTypeSelector from "../components/contact/FeedbackTypeSelector";
import { useContactForm } from "../hooks/useContactForm";

type RootStackParamList = { ContactScreen: undefined };
type Props = NativeStackScreenProps<RootStackParamList, "ContactScreen">;

const ContactScreen = ({ navigation }: Props): React.ReactElement => {
  const bottomInset = useBottomInset();
  const styles = useThemeStyles(
    (c) => ({
      container: { flex: 1, backgroundColor: c.background, paddingBottom: bottomInset },
      scrollContent: { padding: 20 },
    }),
    [bottomInset],
  );

  // The error boundary renders this screen outside the navigator with a stub
  // `navigation`, so the screen keeps taking it as a prop rather than reading
  // it from context.
  const goBack = useCallback((): void => navigation.goBack(), [navigation]);

  const { type, setType, message, setMessage, email, setEmail, isSending, submit } =
    useContactForm(goBack);

  return (
    <KeyboardAvoidingView
      behavior="height"
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <FeedbackTypeSelector value={type} onChange={setType} />
        <FeedbackMessageField value={message} onChangeText={setMessage} />
        <ContactEmailField value={email} onChangeText={setEmail} />
        <ContactSubmitButton isSending={isSending} onPress={submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ContactScreen;
