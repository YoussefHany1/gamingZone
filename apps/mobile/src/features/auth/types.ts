import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";

/**
 * Routes reachable from the auth screens. `MainApp` lives on the root stack,
 * but is included here so the auth screens can `replace` into it after a
 * successful sign-in without falling back to a local param list per screen.
 */
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  MainApp: undefined;
};

export type AuthNavigationProp<RouteName extends keyof AuthStackParamList> =
  NativeStackNavigationProp<AuthStackParamList, RouteName>;

export type AuthScreenProps<RouteName extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, RouteName>;

export type Gender = "male" | "female";

export type AuthPickerOption = {
  label: string;
  value: string;
};
