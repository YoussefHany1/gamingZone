import { useEffect, useState } from "react";
import firestore from "@react-native-firebase/firestore";
import { useAuthStore } from "@/src/store/useAuthStore";
import type { FirestoreUser } from "@/src/features/settings/types";

export function useIsAdmin(): boolean {
  const user = useAuthStore((state) => state.user);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    let isMounted = true;

    firestore()
      .collection("users")
      .doc(user.uid)
      .get()
      .then((doc) => {
        if (!isMounted) return;
        setIsAdmin(
          doc.exists() &&
            (doc.data() as FirestoreUser | undefined)?.isAdmin === true,
        );
      })
      .catch((err) => {
        console.error("[useIsAdmin] Failed to fetch user doc:", err);
        if (isMounted) setIsAdmin(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  return isAdmin;
}