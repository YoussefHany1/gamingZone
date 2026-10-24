import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import type { PickerOption } from "@/src/types/sharedTypes";
import type { ReauthMethod } from "@/src/features/settings/types";

export type EditProfileAvatarProps = {
  imageUri: string | null;
  onPress: () => void;
};

export type EmailVerificationCardProps = {
  emailVerified: boolean;
  /** True while the "I've verified" check is in flight. */
  isChecking: boolean;
  onSendEmail: () => Promise<void>;
  onRefresh: () => Promise<void>;
};

export type ProfileNameFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
};

export type ProfileDobFieldProps = {
  value: string;
  isPickerVisible: boolean;
  onOpenPicker: () => void;
  onChange: (event: DateTimePickerEvent, selectedDate?: Date) => void;
};

export type ProfileGenderSelectorProps = {
  value: string;
  onChange: (gender: string) => void;
};

export type ProfileCountryPickerProps = {
  options: PickerOption[];
  value: string;
  onChange: (countryCode: string) => void;
};

export type ProfilePlatformSelectorProps = {
  value: string;
  onChange: (platform: string) => void;
};

export type SteamSyncButtonProps = {
  onPress: () => void;
};

export type ReauthModalProps = {
  visible: boolean;
  method: ReauthMethod;
  password: string;
  errorMessage: string | null;
  isSubmitting: boolean;
  /** Shows the Discord escape hatch for password accounts that were created with Discord. */
  showDiscordAlternative: boolean;
  onChangePassword: (value: string) => void;
  onSubmitPassword: () => void;
  onVerifyWithGoogle: () => void;
  onVerifyWithDiscord: () => void;
  onCancel: () => void;
};
