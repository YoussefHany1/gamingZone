import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { useAuthStore } from "@/src/store/useAuthStore";
import type { SetupGenreId, SetupPlatformId } from "../constants";

export type UserSetupPreferences = {
  preferredPlatforms: SetupPlatformId[];
  favoriteGenres: SetupGenreId[];
};

const empty: UserSetupPreferences = { preferredPlatforms: [], favoriteGenres: [] };

export function useUserPreferences(): UserSetupPreferences {
  const user = useAuthStore((s) => s.user);
  const [prefs, setPrefs] = useState<UserSetupPreferences>(empty);

  useEffect(() => {
    if (!user || user.isAnonymous) {
      setPrefs(empty);
      return;
    }
    const ref = firestore().collection("users").doc(user.uid);
    const unsub = ref.onSnapshot(
      (doc) => {
        const data = doc.data() as
          | { preferredPlatforms?: unknown; favoriteGenres?: unknown }
          | undefined;
        const preferredPlatforms = Array.isArray(data?.preferredPlatforms)
          ? (data!.preferredPlatforms.filter((x): x is SetupPlatformId => typeof x === "string") as SetupPlatformId[])
          : [];
        const favoriteGenres = Array.isArray(data?.favoriteGenres)
          ? (data!.favoriteGenres.filter((x): x is SetupGenreId => typeof x === "string") as SetupGenreId[])
          : [];
        setPrefs({ preferredPlatforms, favoriteGenres });
      },
      () => {
        setPrefs(empty);
      },
    );
    return unsub;
  }, [user]);

  return prefs;
}
