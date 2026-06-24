
import { messaging, db, firestore } from "./firebase.js";

import {
  getToken,
  onMessage
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging.js";

/* ======================
   INIT PUSH NOTIFICATIONS
====================== */

export async function initPush(user) {

  const btn = document.getElementById("enablePushBtn");

  if (!btn) {
    console.log("Pulsante notifiche non trovato");
    return;
  }

  btn.addEventListener("click", async () => {

    try {

      const permission =
        await Notification.requestPermission();

      console.log("Permesso:", permission);

      if (permission !== "granted") {
        alert("Notifiche non autorizzate");
        return;
      }

      const registration =
        await navigator.serviceWorker.register(
          "/planner-turni/firebase-messaging-sw.js"
        );

      const token = await getToken(messaging, {
        vapidKey:
          "BFbZ0Pz3kOKUY0FQFGy85omU5UT22XK4Dg8NDkiU4gueTSN4J8KJLz3-XKIV73Upqe1XZLS1yRnq_9yBFMgBfCc",
        serviceWorkerRegistration: registration
      });

      console.log("TOKEN:", token);

      if (user?.email && token) {

        await firestore.setDoc(
          firestore.doc(db, "users", user.email),
          {
            email: user.email,
            fcmToken: token,
            lastUpdate: new Date()
          },
          { merge: true }
        );

      }

      alert("✅ Notifiche attivate");

    } catch (err) {

      console.error(err);

      alert(
        "❌ Errore attivazione notifiche"
      );

    }

  });

}

/* ======================
   NOTIFICHE APP APERTA
====================== */

export function listenForegroundNotifications() {

  onMessage(messaging, (payload) => {

    console.log("📩 NOTIFICA APP APERTA:", payload);

    const title = payload.notification?.title || "Nuova notifica";
    const body = payload.notification?.body || "";

    alert(`${title}\n\n${body}`);

  });

}


// ======================
// 🔔 BOTTONE ATTIVA PUSH
// ======================

document.addEventListener("DOMContentLoaded", () => {

  const btn = document.getElementById("enablePushBtn");

  if(btn){

    btn.addEventListener("click", () => {

      initPush(window.CURRENT_USER);

    });

  }

});
