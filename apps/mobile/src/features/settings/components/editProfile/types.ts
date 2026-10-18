import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import type { PickerOption } from "@/src/types/sharedTypes";

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
