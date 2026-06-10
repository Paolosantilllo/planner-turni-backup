
/* ======================
   LOGIN.JS PULITO
====================== */

import { auth } from "./firebase.js";

import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

/* ======================
   LOGIN FUNZIONE
====================== */

window.login = async function () {

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Inserisci email e password");
    return;
  }

  try {

    await signInWithEmailAndPassword(auth, email, password);

    // login ok → vai alla home
    window.location.href = "index.html";

  } catch (error) {

    console.error("Errore login:", error);

    alert("Email o password errati");

  }

};
