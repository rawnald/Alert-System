import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

const hasCredentials = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
);

const firebaseAdminApp =
  getApps().length === 0
    ? initializeApp(
        hasCredentials
          ? {
              credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(
                  /\\n/g,
                  "\n"
                ),
              }),
            }
          : {
              projectId:
                process.env.FIREBASE_PROJECT_ID ||
                process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            }
      )
    : getApps()[0];

export const firebaseMessaging =
  getMessaging(firebaseAdminApp);

export const getAdminMessaging = () => firebaseMessaging;
