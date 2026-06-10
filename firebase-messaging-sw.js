importScripts("https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js");

/* ======================
   FIREBASE INIT
====================== */

firebase.initializeApp({
  apiKey: "AIzaSyBCKQp_DA2Bjbs6g27Wwl8eo_kyzzI2A40",
  authDomain: "calendario-rep.firebaseapp.com",
  projectId: "calendario-rep",
  storageBucket: "calendario-rep.firebasestorage.app",
  messagingSenderId: "1067128179274",
  appId: "1:1067128179274:web:e1c7174c25bdabee2ff4b3"
});

const messaging = firebase.messaging();

/* ======================
   BACKGROUND NOTIFICATION
====================== */

messaging.onBackgroundMessage(function(payload) {

  console.log("📩 Background message:", payload);

  const notification = payload.notification || {};
  const title = notification.title || "Nuova notifica";
  const body = notification.body || "";

  self.registration.showNotification(title, {

    body: body,
    icon: "/icon.png",

    /* EXTRA (consigliato) */
    badge: "/icon.png",
    vibrate: [200, 100, 200],

    data: payload.data || {},

    actions: [
      {
        action: "open",
        title: "Apri"
      }
    ]
  });

});
self.addEventListener("notificationclick", function(event) {

  console.log("🔔 Notifica cliccata:", event);

  event.notification.close();

  const data = event.notification.data || {};

  const requestId = data.requestId;

  event.waitUntil(

    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {

      // se app già aperta
      for (let client of clientList) {

  if ("focus" in client) {

    client.focus();

    client.postMessage({
      type: "OPEN_REQUEST",
      requestId: requestId
    });

    return;

  }

}

      // se app chiusa → apri nuova finestra
      if (clients.openWindow) {

        return clients.openWindow(
          "/index.html?requestId=" + requestId
        );

      }

    })

  );

});
