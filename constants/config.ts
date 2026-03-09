import { TestIds } from "react-native-google-mobile-ads";

export const SERVER_URL = "https://igdb-api-omega.vercel.app" as const;
export const adUnitId: string = __DEV__
  ? TestIds.BANNER
  : "ca-app-pub-4635812020796700/3199160392";
