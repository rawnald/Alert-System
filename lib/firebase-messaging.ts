import { getMessaging, getToken, onMessage, isSupported, MessagePayload, Messaging } from "firebase/messaging";
import { firebaseApp } from "./supabase";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

let messagingInstance: Messaging | null = null;

export function isNative(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

/**
 * Initializes and returns the Firebase Messaging instance if supported in current environment.
 */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined" || isNative()) {
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
 * Requests notification permission from the user, registers the device,
 * and retrieves the device's FCM registration token (supports both Native Android APK and Web).
 */
export async function requestFcmToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  // --- NATIVE ANDROID APK FLOW ---
  if (Capacitor.isNativePlatform()) {
    try {
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === "prompt") {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== "granted") {
        throw new Error("Push notification permission was denied on this Android device.");
      }

      // Create high-urgency emergency channel on Android
      await PushNotifications.createChannel({
        id: "emergency_alerts",
        name: "Emergency Alerts",
        description: "Critical earthquake and emergency sirens",
        importance: 5,
        visibility: 1,
        sound: "alarm",
        vibration: true,
        lights: true,
        lightColor: "#FF0000",
      });

      return new Promise<string>((resolve, reject) => {
        PushNotifications.addListener("registration", (token) => {
          resolve(token.value);
        });
        PushNotifications.addListener("registrationError", (err) => {
          reject(new Error(`Native Android registration failed: ${err.error}`));
        });
        PushNotifications.register();
      });
    } catch (err) {
      console.error("Native push registration error:", err);
      throw err;
    }
  }

  // --- WEB PUSH FLOW ---
  if (!("Notification" in window)) {
    throw new Error("Notifications are not supported in this browser.");
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error(
        `Notification permission was ${permission}. Please allow notifications in your browser.`
      );
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      throw new Error("Firebase Messaging is not supported in this browser.");
    }

    await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const registration = await navigator.serviceWorker.ready;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      throw new Error("NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing from environment variables.");
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      throw new Error("Firebase getToken returned an empty token.");
    }

    return token;
  } catch (error) {
    console.error("Error retrieving FCM registration token:", error);
    throw error;
  }
}

/**
 * Alias for requestFcmToken for registering device for push notifications.
 */
export const registerForPushNotifications = requestFcmToken;

/**
 * Subscribes to foreground push notifications.
 */
export async function onForegroundMessage(
  callback: (payload: any) => void
): Promise<(() => void) | null> {
  if (isNative()) {
    const handle = await PushNotifications.addListener("pushNotificationReceived", (notification) => {
      callback({
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data,
      });
    });
    return () => handle.remove();
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    return null;
  }

  return onMessage(messaging, callback);
}

