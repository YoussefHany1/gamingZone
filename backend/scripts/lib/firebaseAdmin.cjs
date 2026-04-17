function initFirebaseAdmin(serviceAccountEnvVar) {
  let admin = null;

  try {
    admin = require("firebase-admin");
  } catch (error) {
    return { admin: null, enabled: false, error: error.message };
  }

  const rawServiceAccount = process.env[serviceAccountEnvVar];
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
  } catch (error) {
    return { admin, enabled: false, error: error.message };
  }
}

module.exports = {
  initFirebaseAdmin,
};
