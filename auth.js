
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

    window.CURRENT_USER = CURRENT_USER;
    window.CURRENT_EMPLOYEE = CURRENT_EMPLOYEE;
    window.IS_ADMIN = IS_ADMIN;

    console.log("LOGIN OK:", {
      user: CURRENT_USER,
      employee: CURRENT_EMPLOYEE,
      admin: IS_ADMIN
    });

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
