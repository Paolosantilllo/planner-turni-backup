
import { auth } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

/* ======================
   STATO GLOBALE UTENTE
====================== */

export let CURRENT_USER = null;
export let CURRENT_EMPLOYEE = null;
export let IS_ADMIN = false;

/* ======================
   MAPPATURA UTENTI
====================== */

function mapUser(email) {

  const users = {
    "paolosantillo@yahoo.it": {
      employee: "A",
      role: "ADMIN"
    },
    "dipb.planner@gmail.com": {
      employee: "B",
      role: "USER"
    },
    "dipc.planner@gmail.com": {
      employee: "C",
      role: "USER"
    },
    "dipd.planner@gmail.com": {
      employee: "D",
      role: "USER"
    }
  };

  return users[email] || null;

}

/* ======================
   INIT AUTH GUARD
====================== */

export function initAuth(onReady) {

  onAuthStateChanged(auth, (user) => {

    /* ❌ NON LOGGATO */
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    const data = mapUser(user.email);

    /* ❌ NON AUTORIZZATO */
    if (!data) {

      alert("Utente non autorizzato");

      signOut(auth);
      window.location.href = "login.html";

      return;
    }

    /* ✅ UTENTE VALIDO */
    CURRENT_USER = user.email;
    CURRENT_EMPLOYEE = data.employee;
    IS_ADMIN = data.role === "ADMIN";

    /* 🔔 REGISTRA TOKEN DISPOSITIVO */
(async (user) => {

  try {

    const messaging = getMessaging();

    const permission = await Notification.requestPermission();

    if (permission !== "granted") return;

    const token = await getToken(messaging, {
      vapidKey: "LA_TUA_VAPID_KEY"
    });

    if (!token) return;

    console.log("FCM TOKEN:", token);

    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      employee: CURRENT_EMPLOYEE,
      role: IS_ADMIN ? "ADMIN" : "USER",
      fcmTokens: arrayUnion(token)
    }, { merge: true });

  } catch (err) {
    console.error("Errore registrazione device:", err);
  }

})(user);
    
    window.CURRENT_USER = CURRENT_USER;
    window.CURRENT_EMPLOYEE = CURRENT_EMPLOYEE;
    window.IS_ADMIN = IS_ADMIN;

    console.log("LOGIN OK:", {
      user: CURRENT_USER,
      employee: CURRENT_EMPLOYEE,
      admin: IS_ADMIN
    });

    /* 🔥 MOSTRA APP (FONDAMENTALE PER EVITARE SCHERMO BIANCO) */
    const app = document.getElementById("app");
    if (app) app.style.display = "block";

    /* 🚀 AVVIO APP */
    if (typeof onReady === "function") {
      onReady(user);
    }

  });

}

/* ======================
   LOGOUT
====================== */

export async function logout() {

  try {

    await signOut(auth);

    window.location.href = "login.html";

  } catch (err) {

    console.error("Logout error:", err);

    alert("Errore logout");

  }

}
