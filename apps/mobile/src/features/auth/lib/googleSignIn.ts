/**
 * Google Sign-In configuration shared by the auth screens and the account
 * re-authentication flow.
 *
 * `configure` must run once before any `GoogleSignin` call. Keeping it in a
 * dedicated module means every importer gets the configuration without
 * duplicating the `expo-constants` lookup.
 */
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import Constants from "expo-constants";

const { GOOGLE_WEB_CLIENT_ID } = Constants.expoConfig?.extra ?? {};

GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

export { GoogleSignin, statusCodes };
