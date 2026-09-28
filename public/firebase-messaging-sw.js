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
  appId: "1:754906114814:android:a8f54eaf528fee090e93af",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message: ", payload);

  const title = payload.notification?.title || payload.data?.title || "🚨 EMERGENCY ALERT";
  const options = {
    body: payload.notification?.body || payload.data?.body || "An emergency alert has been issued.",
    icon: payload.notification?.icon || "/next.svg",
    badge: "/next.svg",
    vibrate: [500, 250, 500, 250, 500, 250, 500],
    data: payload.data || {},
    requireInteraction: true,
    tag: "phone-alert",
  };

  self.registration.showNotification(title, options);
});

// Handle notification click to bring app to foreground
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
