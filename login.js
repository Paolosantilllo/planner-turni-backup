
import { initializeApp } 
from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import { 
  getAuth, 
  signInWithEmailAndPassword 
} 
from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBCKQp_DA2Bjbs6g27Wwl8eo_kyzzI2A40",
  authDomain: "calendario-rep.firebaseapp.com",
  projectId: "calendario-rep",
  storageBucket: "calendario-rep.firebasestorage.app",
  messagingSenderId: "1067128179274",
  appId: "1:1067128179274:web:e1c7174c25bdabee2ff4b3"
};

// INIT FIREBASE
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// FUNZIONE LOGIN
window.login = async function () {

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);

    // 👉 vai alla home DOPO login riuscito
    window.location.href = "index.html";

  } catch (error) {
    console.error(error);
    alert("Email o password errati");
  }
};
