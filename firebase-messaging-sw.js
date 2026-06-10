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
   NOTIFICHE APP CHIUSA
====================== */

messaging.onBackgroundMessage((payload) => {

  console.log("📩 Background message:", payload);

  const notification = payload.notification || {};

  self.registration.showNotification(
    notification.title || "Planner REP",
    {
      body: notification.body || "",
      icon: "/logo.png",
      badge: "/logo.png",
      vibrate: [200, 100, 200],

      data: payload.data || {},

      actions: [
        {
          action: "open",
          title: "Apri"
        }
      ]
    }
  );

});

/* ======================
   CLICK NOTIFICA
====================== */

self.addEventListener("notificationclick", (event) => {

  event.notification.close();

  const data = event.notification.data || {};
  const requestId = data.requestId || "";

  event.waitUntil(

    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then((clientList) => {

      for (const client of clientList) {

        if ("focus" in client) {

          client.focus();

          client.postMessage({
            type: "OPEN_REQUEST",
            requestId
          });

          return;
        }
      }

      if (clients.openWindow) {

        return clients.openWindow(
          "/index.html?requestId=" + requestId
        );
      }

    })

  );

});
