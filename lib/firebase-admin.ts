import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getMessaging, Messaging } from "firebase-admin/messaging";

let adminApp: App | null = null;
let adminMessagingInstance: Messaging | null = null;

function sanitizePrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;

  let cleaned = key.trim();

  // If entire service account JSON was accidentally pasted
  if (cleaned.startsWith("{")) {
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.private_key) {
        cleaned = parsed.private_key.trim();
      }
    } catch {
      // not valid JSON, proceed as raw string
    }
  }

  // Remove surrounding single or double quotes
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }

  // Replace literal '\n' characters with actual newlines
  return cleaned.replace(/\\n/g, "\n");
}

export function getFirebaseAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = sanitizePrivateKey(rawKey);

  if (projectId && clientEmail && privateKey) {
    try {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      return adminApp;
    } catch (error) {
      console.error("Firebase Admin initialization error:", error);
    }
  }

  // Fallback app initialization to prevent build-time crashes
  adminApp = initializeApp({
    projectId: projectId || "phone-alert-system",
  });
  return adminApp;
}

export function getAdminMessaging(): Messaging {
  if (!adminMessagingInstance) {
    const app = getFirebaseAdminApp();
    adminMessagingInstance = getMessaging(app);
  }
  return adminMessagingInstance;
}

/**
 * Lazy proxy export for firebaseMessaging so `firebaseMessaging.send(...)`
 * can be imported directly without executing cert() during next build page collection.
 */
export const firebaseMessaging = new Proxy({} as Messaging, {
  get(_target, prop) {
    const instance = getAdminMessaging();
    const value = (instance as any)[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
