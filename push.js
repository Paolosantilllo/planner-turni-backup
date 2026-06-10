
/* ======================
   PUSH NOTIFICATIONS SETUP
====================== */

import { messaging, db, firestore } from "./firebase.js";

import {
  getToken,
  onMessage
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging.js";

/* ======================
   RICHIEDI PERMESSO + TOKEN
====================== */

export async function initPush(user){

  try {

    const permission = await Notification.requestPermission();

    if(permission !== "granted"){
      console.log("Notifiche negate");
      return;
    }

    const token = await getToken(messaging, {
      vapidKey: "LA_TUA_VAPID_KEY"
    });

    console.log("PUSH TOKEN:", token);

    // salva token su Firestore
    await firestore.setDoc(
      firestore.doc(db, "users", user.email),
      {
        email: user.email,
        token: token
      },
      { merge: true }
    );

  } catch (err) {
    console.error("Errore push:", err);
  }

}

/* ======================
   NOTIFICHE A APP APERTA
====================== */

export function listenForegroundNotifications(){

  onMessage(messaging, (payload) => {

    console.log("NOTIFICA IN APP:", payload);

    alert(payload.notification.title + "\n" + payload.notification.body);

  });

}
