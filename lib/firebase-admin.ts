import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getMessaging, Messaging } from "firebase-admin/messaging";

let adminApp: App;

/**
 * Initializes and returns the Firebase Admin App instance.
 * Safe for serverless environments (reuses existing initialized app).
 */
export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // 1. Check for single JSON service account string
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountJson) {
    try {
      const parsedCredentials = JSON.parse(serviceAccountJson);
      adminApp = initializeApp({
        credential: cert(parsedCredentials),
      });
      return adminApp;
    } catch (err) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:", err);
    }
  }

  // 2. Check for individual environment variables
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  if (projectId && clientEmail && privateKey) {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    return adminApp;
  }

  // 3. Fallback
  adminApp = initializeApp({
    projectId: projectId || undefined,
  });
  return adminApp;
}

/**
 * Returns the Firebase Admin Messaging instance.
 */
export function getAdminMessaging(): Messaging {
  const app = getFirebaseAdminApp();
  return getMessaging(app);
}
