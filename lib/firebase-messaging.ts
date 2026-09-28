import { getMessaging, getToken, onMessage, isSupported, MessagePayload, Messaging } from "firebase/messaging";
import { firebaseApp } from "./supabase";

let messagingInstance: Messaging | null = null;

/**
 * Initializes and returns the Firebase Messaging instance if supported in current environment.
 */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const supported = await isSupported();
  if (!supported) {
    console.warn("Firebase Messaging is not supported in this browser/environment.");
    return null;
  }

  if (!messagingInstance) {
    messagingInstance = getMessaging(firebaseApp);
  }

  return messagingInstance;
}

/**
 * Requests notification permission from the user, registers the service worker,
 * and retrieves the device's FCM registration token.
 */
export async function requestFcmToken(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("Notifications are not supported in this environment.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission was not granted:", permission);
      return null;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      return null;
    }

    // Ensure service worker is registered
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error("NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set in environment variables.");
    }

    const token = await getToken(messaging, {
      vapidKey: vapidKey || undefined,
      serviceWorkerRegistration: registration,
    });

    return token || null;
  } catch (error) {
    console.error("Error retrieving FCM registration token:", error);
    return null;
  }
}

/**
 * Alias for requestFcmToken for registering device for push notifications.
 */
export const registerForPushNotifications = requestFcmToken;

/**
 * Subscribes to foreground push notifications.
 *
 * @param callback Handler called when a push message arrives while the web app is in the foreground.
 * @returns An unsubscribe function, or null if messaging is not supported.
 */
export async function onForegroundMessage(
  callback: (payload: MessagePayload) => void
): Promise<(() => void) | null> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    return null;
  }

  return onMessage(messaging, callback);
}
