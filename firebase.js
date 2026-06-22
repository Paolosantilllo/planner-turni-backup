/* ======================
   FIREBASE CORE INIT
====================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import {
  getAuth
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

import {
  getMessaging
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging.js";

/* ======================
   CONFIG FIREBASE
====================== */

const firebaseConfig = {
  apiKey: "AIzaSyBCKQp_DA2Bjbs6g27Wwl8eo_kyzzI2A40",
  authDomain: "calendario-rep.firebaseapp.com",
  projectId: "calendario-rep",
  storageBucket: "calendario-rep.firebasestorage.app",
  messagingSenderId: "1067128179274",
  appId: "1:1067128179274:web:e1c7174c25bdabee2ff4b3"
};

/* ======================
   INIT APP FIREBASE
====================== */

const app = initializeApp(firebaseConfig);

/* ======================
   SERVIZI CORE
====================== */

export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);

/* ======================
   FIRESTORE API WRAPPER (IMPORTANTE)
====================== */

export const firestore = {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  setDoc
};

/* ======================
   (OPTIONAL) GLOBAL WINDOW PER COMPATIBILITÀ
====================== */

window.auth = auth;
window.db = db;
window.messaging = messaging;
window.firebaseFirestore = firestore;
