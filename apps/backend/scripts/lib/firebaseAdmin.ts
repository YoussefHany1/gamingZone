import * as admin from 'firebase-admin';
import { env } from './config';

export interface FirebaseAdminState {
  admin: typeof admin;
  enabled: boolean;
  error: string | null;
}

function initFirebaseAdmin(serviceAccountEnvVarKey: keyof typeof env): FirebaseAdminState {
  const rawServiceAccount = env[serviceAccountEnvVarKey];
  if (!rawServiceAccount) {
    return { admin, enabled: false, error: null };
  }

  try {
    const serviceAccount = JSON.parse(rawServiceAccount);

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
    }

    return { admin, enabled: true, error: null };
  } catch (error: any) {
    return { admin, enabled: false, error: error.message };
  }
}

export { initFirebaseAdmin };
