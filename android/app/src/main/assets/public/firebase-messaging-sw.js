// Scripts for firebase and firebase messaging
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

// Initialize Firebase inside the service worker
const firebaseConfig = {
  apiKey: "AIzaSyDNM-BcOLk54QLfdwOfF3Y1cx9GJoKJ5jQ",
  authDomain: "phone-alert-system.firebaseapp.com",
  projectId: "phone-alert-system",
  storageBucket: "phone-alert-system.firebasestorage.app",
  messagingSenderId: "754906114814",
  appId: "1:754906114814:web:860e5ae2224b1c0c0e93af",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages via Firebase SDK
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message: ", payload);

  const title = payload.notification?.title || payload.data?.title || "🚨 EMERGENCY ALERT";
  const options = {
    body: payload.notification?.body || payload.data?.body || payload.data?.message || "An emergency alert has been issued.",
    icon: "/alert-icon.png",
    badge: "/alert-icon.png",
    vibrate: [500, 250, 500, 250, 500, 250, 500],
    data: payload.data || {},
    requireInteraction: true,
    tag: "phone-alert",
  };

  self.registration.showNotification(title, options);
});

// Fallback listener for raw Web Push events
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.notification?.title || payload.data?.title || "🚨 EMERGENCY ALERT";
    const body = payload.notification?.body || payload.data?.body || payload.data?.message || "Emergency alert issued!";

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: "/alert-icon.png",
        badge: "/alert-icon.png",
        vibrate: [500, 250, 500, 250, 500, 250, 500],
        requireInteraction: true,
        tag: "phone-alert",
        data: payload.data || {},
      })
    );
  } catch (err) {
    console.error("Push event error:", err);
  }
});

// Handle notification click to open /alert page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && "focus" in client) {
          if ("navigate" in client) {
            client.navigate("/alert");
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/alert");
      }
    })
  );
});
