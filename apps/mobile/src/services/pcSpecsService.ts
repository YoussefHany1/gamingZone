/**
 * Firestore access for the signed-in user's PC specs.
 *
 * Stored on the user document (`users/{uid}.pcSpecs`) so it follows the account
 * across devices and is covered by the existing owner-write rule. Guests never
 * reach this module: the store keeps their copy in MMKV only.
 */
import firestore from "@react-native-firebase/firestore";
import type { PcSpecs } from "@gaming-zone/core";
import { isValidPcSpecs } from "@gaming-zone/utils";

const USERS_COLLECTION = "users";

function userDoc(uid: string) {
  return firestore().collection(USERS_COLLECTION).doc(uid);
}

/** Writes the specs without touching any other user field. */
export async function savePcSpecsToAccount(uid: string, specs: PcSpecs): Promise<void> {
  if (!uid) throw new Error("savePcSpecsToAccount requires a uid");
  await userDoc(uid).set({ pcSpecs: { ...specs } }, { merge: true });
}

/** Reads the account copy once. Malformed documents resolve to null. */
export async function readPcSpecsFromAccount(uid: string): Promise<PcSpecs | null> {
  if (!uid) return null;
  const snapshot = await userDoc(uid).get();
  const value = snapshot.data()?.pcSpecs;
  return isValidPcSpecs(value) ? value : null;
}

export type PcSpecsSnapshot = {
  /** Null when the document exists but has no valid specs yet. */
  specs: PcSpecs | null;
  /** False when the user document itself is missing. */
  exists: boolean;
};

/**
 * Subscribes to the account copy. The callback fires immediately with the
 * current document (or `exists: false`) and again after every change, which is
 * what makes a save on another device show up without a manual refresh.
 */
export function subscribePcSpecsToAccount(
  uid: string,
  onData: (snapshot: PcSpecsSnapshot) => void,
  onError: (error: unknown) => void,
): () => void {
  return userDoc(uid).onSnapshot(
    (snapshot) => {
      const value = snapshot.data()?.pcSpecs;
      onData({
        specs: isValidPcSpecs(value) ? value : null,
        exists: Boolean(snapshot.exists),
      });
    },
    onError,
  );
}
