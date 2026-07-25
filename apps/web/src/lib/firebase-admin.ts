import "server-only";
import * as admin from "firebase-admin";

function getOrInitAdmin(): admin.app.App {
  // If already initialized successfully, return the existing app
  if (admin.apps.length) {
    return admin.app();
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

export const getAdminAuth = () => getOrInitAdmin().auth();
export const getAdminDb = () => getOrInitAdmin().firestore();


