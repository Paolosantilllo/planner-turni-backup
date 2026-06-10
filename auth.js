
/* ======================
   IMPORT FIREBASE
====================== */

import { auth } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

/* ======================
   STATO UTENTE GLOBALE
====================== */

export let CURRENT_USER = null;
export let CURRENT_EMPLOYEE = null;
export let IS_ADMIN = false;

/* ======================
   MAPPATURA UTENTI
====================== */

function mapUser(email){

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
   INIT AUTH
====================== */

export function initAuth(onReady){

  onAuthStateChanged(auth, (user) => {

    // ❌ NON LOGGATO
    if(!user){
      window.location.href = "login.html";
      return;
    }

    const data = mapUser(user.email);

    // ❌ NON AUTORIZZATO
    if(!data){
      alert("Utente non autorizzato");
      signOut(auth);
      window.location.href = "login.html";
      return;
    }

    // ✅ LOGIN OK
    CURRENT_USER = user.email;
    CURRENT_EMPLOYEE = data.employee;
    IS_ADMIN = data.role === "ADMIN";

    console.log("USER:", CURRENT_USER);
    console.log("EMPLOYEE:", CURRENT_EMPLOYEE);
    console.log("ADMIN:", IS_ADMIN);

    // esporto su window per compatibilità vecchio codice
    window.CURRENT_USER = CURRENT_USER;
    window.CURRENT_EMPLOYEE = CURRENT_EMPLOYEE;
    window.IS_ADMIN = IS_ADMIN;

    onReady(user);

  });

}

/* ======================
   LOGOUT
====================== */

export async function logout(){

  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (err) {
    console.error(err);
    alert("Errore logout");
  }

}
