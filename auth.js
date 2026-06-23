
import { auth } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

import { db } from "./firebase.js";

import {
  doc,
  setDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

import {
  getMessaging,
  getToken
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging.js";

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

export async function initAuth(onReady) {

  onAuthStateChanged(auth, async (user) => {

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
await registerDeviceToken(user);

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

async function registerDeviceToken(user) {

  try {

    console.log("🔔 registerDeviceToken PARTITA");
    alert("🔔 registerDeviceToken PARTITA");

    console.log("Notification support:",
      "Notification" in window);

    console.log("Permission attuale:",
      Notification.permission);

    const permission = await Notification.requestPermission();

alert("Permesso notifiche: " + permission);

    console.log("Permission dopo richiesta:",
      permission);

    if (permission !== "granted") {
      console.log("❌ Notifiche NON autorizzate");
      return;
    }

    const messaging = getMessaging();

    const token = await getToken(messaging, {
      vapidKey: "BFbZ0Pz3kOKUY0FQFGy85omU5UT22XK4Dg8NDkiU4gueTSN4J8KJLz3-XKIV73Upqe1XZLS1yRnq_9yBFMgBfCc"
    });

    console.log("TOKEN OTTENUTO:", token);

    if (!token) {
      console.log("❌ Nessun token ricevuto");
      return;
    }

    const uid = user.uid || user.email;

    await setDoc(doc(db, "users", uid), {
      email: user.email,
      employee: CURRENT_EMPLOYEE,
      role: IS_ADMIN ? "ADMIN" : "USER",
      fcmTokens: arrayUnion(token)
    }, { merge: true });

    console.log("✅ Token salvato su Firestore");

  } catch (err) {

    console.error("❌ ERRORE REGISTER TOKEN:", err);
    alert("ERRORE: " + err.message);

  }

}
