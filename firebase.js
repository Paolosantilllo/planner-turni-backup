import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getMessaging } 
from "https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging.js";
import * as firebaseFirestore from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBCKQp_DA2Bjbs6g27Wwl8eo_kyzzI2A40",
  authDomain: "calendario-rep.firebaseapp.com",
  projectId: "calendario-rep",
  storageBucket: "calendario-rep.firebasestorage.app",
  messagingSenderId: "1067128179274",
  appId: "1:1067128179274:web:e1c7174c25bdabee2ff4b3"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
window.db = db;

window.firebaseFirestore = firebaseFirestore;

const messaging = getMessaging(app);
window.messaging = messaging;
