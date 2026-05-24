import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {

  apiKey: "AIzaSyBNE6sjsiq1cT1JI_LbtjEwt1h4Lp1dFEk",

  authDomain: "turni-f4774.firebaseapp.com",

  projectId: "turni-f4774",

  storageBucket: "turni-f4774.firebasestorage.app",

  messagingSenderId: "765139281017",

  appId: "1:765139281017:web:35c47e467125ae6fc060a8"

};

const app =
  initializeApp(firebaseConfig);

const db =
  getFirestore(app);

window.db = db;