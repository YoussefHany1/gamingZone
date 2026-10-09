import * as admin from 'firebase-admin';
import { requireFcmServiceAccount } from './config';

export interface FirebaseAdminState {
  admin: typeof admin;
  enabled: boolean;
  error: string | null;
  appName: string | null;
}

/**
 * Initializes a NAMED Firebase app so each service owns its own instance.
 *
 * Using named apps (rather than the shared default app) lets one service
 * tear its app down without invalidating the others' — otherwise a
 * teardown (e.g. free-games) leaves later FCM sends (e.g. weekly-summary)
 * throwing "The default Firebase app does not exist".
 */
function initFirebaseAdmin(appName: string): FirebaseAdminState {
  const rawServiceAccount = requireFcmServiceAccount();
  if (!rawServiceAccount) {
    return { admin, enabled: false, error: null, appName: null };
  }

  try {
    const serviceAccount = JSON.parse(rawServiceAccount);

    const existing = admin.apps.find(
      (app): app is admin.app.App => app !== null && app.name === appName,
    );

    if (!existing) {
      admin.initializeApp(
        {
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id,
        },
        appName,
      );
    }

    return { admin, enabled: true, error: null, appName };
  } catch (error: any) {
    return { admin, enabled: false, error: error.message, appName: null };
  }
}

/** Resolves the named app for a state, or null if it was never created / was torn down. */
function firebaseAppFor(state: FirebaseAdminState): admin.app.App | null {
  if (state.appName === null) return null;
  return (
    admin.apps.find(
      (app): app is admin.app.App => app !== null && app.name === state.appName,
    ) ?? null
  );
}

export { initFirebaseAdmin, firebaseAppFor };
