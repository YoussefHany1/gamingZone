/**
 * Shared Firebase Admin bootstrap.
 *
 * Every server-side feature that needs elevated Firebase access (linked
 * accounts, Discord sign-in) goes through this one lazily-initialised instance.
 * Calling `initializeApp` from two modules would throw "The default Firebase app
 * already exists", and two named apps would open two Firestore clients inside
 * the same lambda — so the singleton lives here.
 *
 * The auth/firestore sub-modules are dynamic imports so that a missing optional
 * dependency can never crash the whole lambda at boot: the affected endpoints
 * degrade to auth errors instead, and the rest of the API keeps working.
 */
import fs from 'fs';
// firebase-admin@14 moved `cert`/`initializeApp` out of the root package — the
// canonical location in v13+ is the `firebase-admin/app` submodule (verified
// working as named ESM imports under Node 22/24).
import { cert, initializeApp } from 'firebase-admin/app';

let adminReady = false;
let adminModules = null; // { app, auth, firestore }

/** Returns `{ auth, firestore }`, or null when no service account is configured. */
export async function getAdmin() {
  if (adminReady) return adminModules;

  const raw = process.env.FCM_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON || null;

  let serviceAccount = null;
  try {
    if (raw) {
      serviceAccount = JSON.parse(String(raw).trim());
    } else if (process.env.SERVICE_ACCOUNT) {
      // Local-dev convenience: path to the JSON file.
      serviceAccount = JSON.parse(
        fs.readFileSync(
          fs.existsSync(process.env.SERVICE_ACCOUNT)
            ? process.env.SERVICE_ACCOUNT
            : `./serviceAccountKey.json`,
          'utf8',
        ),
      );
    }
  } catch (err) {
    console.error('Firebase admin: failed to parse service account credentials:', err);
  }

  if (!serviceAccount) {
    console.error(
      'Firebase admin requires a service account (env FCM_SERVICE_ACCOUNT as JSON string).',
    );
    adminReady = true;
    return null;
  }

  try {
    const [{ getAuth }, { getFirestore }] = await Promise.all([
      import('firebase-admin/auth'),
      import('firebase-admin/firestore'),
    ]);
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
    });
    adminModules = { app, auth: getAuth(app), firestore: getFirestore(app) };
    adminReady = true;
  } catch (err) {
    console.error('Firebase admin: failed to initialise:', err);
  }
  return adminModules;
}
