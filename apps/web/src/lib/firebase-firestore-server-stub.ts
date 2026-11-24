/**
 * Server-side stand-in for `firebase/firestore`.
 *
 * Next.js server bundles evaluate client components while rendering their HTML.
 * The real Firestore SDK uses protobufjs code generation (`new Function`), which
 * Workers disallow, so `next.config.ts` aliases `firebase/firestore` to this
 * module for every non-browser build. Browser builds keep using the real SDK.
 *
 * Nothing here should ever do work on the server. The exports are inert so that
 * module initialization (for example `getFirestore(app)` in `src/lib/firebase`)
 * and any accidental render-time call cannot crash Workers SSR.
 */

export type DocumentData = Record<string, unknown>;

type InertFirestoreValue = {
  readonly __firestoreServerStub: true;
};

const inert = (): InertFirestoreValue => ({ __firestoreServerStub: true });

// Parameters are intentionally omitted: JavaScript ignores extra arguments at
// runtime, and the source is type-checked against the real Firestore SDK.
export const getFirestore = (): InertFirestoreValue => inert();

export const collection = (): InertFirestoreValue => inert();
export const doc = (): InertFirestoreValue => inert();
export const query = (): InertFirestoreValue => inert();
export const where = (): InertFirestoreValue => inert();
export const orderBy = (): InertFirestoreValue => inert();
export const limit = (): InertFirestoreValue => inert();
export const startAfter = (): InertFirestoreValue => inert();
export const serverTimestamp = (): InertFirestoreValue => inert();
export const deleteField = (): InertFirestoreValue => inert();

export const getDoc = async () => ({
  exists: () => false,
  data: () => undefined,
  id: "",
  ref: inert(),
});

export const getDocs = async () => ({
  empty: true,
  size: 0,
  docs: [],
  forEach: () => undefined,
});

export const setDoc = async (): Promise<InertFirestoreValue> => inert();
export const updateDoc = async (): Promise<InertFirestoreValue> => inert();
export const deleteDoc = async (): Promise<InertFirestoreValue> => inert();

export const writeBatch = () => ({
  set: () => inert(),
  update: () => inert(),
  delete: () => inert(),
  commit: async () => inert(),
});

export const onSnapshot = () => () => undefined;
