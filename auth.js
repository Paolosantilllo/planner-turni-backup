import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

import {
  doc,
  getDoc,
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
   INIT AUTH GUARD
====================== */

export async function initAuth(onReady) {

  onAuthStateChanged(auth, async (user) => {

    console.log("🔥 AUTH TRIGGER PARTITO", user);

    if (!user) {
      window.location.href = "login.html";
      return;
    }

    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists()) {
      alert("Utente non autorizzato");
      await signOut(auth);
      window.location.href = "login.html";
      return;
    }

    const data = snap.data();

    if (!data.active) {
      alert("Account disattivato");
      await signOut(auth);
      window.location.href = "login.html";
      return;
    }

    /* ✅ UTENTE VALIDO */
    CURRENT_USER = user.email;
    CURRENT_EMPLOYEE = data.employee;
    IS_ADMIN = data.role === "ADMIN";

    await registerDeviceToken(user);

    window.CURRENT_USER = CURRENT_USER;
    window.CURRENT_EMPLOYEE = CURRENT_EMPLOYEE;
    window.IS_ADMIN = IS_ADMIN;

    window.dispatchEvent(new Event("authReady"));

    console.log("LOGIN OK:", {
      user: CURRENT_USER,
      employee: CURRENT_EMPLOYEE,
      admin: IS_ADMIN
    });

    const app = document.getElementById("app");
    if (app) app.style.display = "block";

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

/* ======================
   DEVICE TOKEN FCM
====================== */

async function registerDeviceToken(user) {

  try {

    if (!("Notification" in window)) return;

    const permission = await Notification.requestPermission();

    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.register(
      "/planner-turni/firebase-messaging-sw.js"
    );

    const messaging = getMessaging();

    const token = await getToken(messaging, {
      vapidKey: "BFbZ0Pz3kOKUY0FQFGy85omU5UT22XK4Dg8NDkiU4gueTSN4J8KJLz3-XKIV73Upqe1XZLS1yRnq_9yBFMgBfCc",
      serviceWorkerRegistration: registration
    });

    if (!token) return;

    const uid = user.uid;

    await setDoc(
      doc(db, "users", uid),
      {
        email: user.email,
        employee: CURRENT_EMPLOYEE,
        role: IS_ADMIN ? "ADMIN" : "USER",
        fcmTokens: arrayUnion(token)
      },
      { merge: true }
    );

  } catch (err) {
    console.error("❌ ERRORE REGISTER TOKEN:", err);
  }

}
