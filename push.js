
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
      vapidKey: "BFbZ0Pz3kOKUY0FQFGy85omU5UT22XK4Dg8NDkiU4gueTSN4J8KJLz3-XKIV73Upqe1XZLS1yRnq_9yBFMgBfCc"
    });


    if (token) {

      console.log("🔥 PUSH TOKEN:", token);


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
