
import { messaging, db, firestore } from "./firebase.js";

import {
  getToken,
  onMessage
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging.js";

/* ======================
   INIT PUSH NOTIFICATIONS
====================== */

export async function initPush(user) {

  try {

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("❌ Notifiche negate");
      return;
    }

    const token = await getToken(messaging, {
      vapidKey: "LA_TUA_VAPID_KEY"
    });

    console.log("🔥 PUSH TOKEN:", token);

    // 🔥 SALVATAGGIO TOKEN UTENTE SU FIRESTORE
    if (user?.email) {

      await firestore.setDoc(
        firestore.doc(db, "users", user.email),
        {
          email: user.email,
          token: token,
          lastUpdate: new Date()
        },
        { merge: true }
      );

    }

  } catch (err) {
    console.error("❌ Errore push:", err);
  }

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
