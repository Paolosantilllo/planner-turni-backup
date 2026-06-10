/* ======================
   FIREBASE IMPORT
====================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getFirestore, doc, collection, onSnapshot, addDoc, updateDoc, deleteDoc, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

/* ======================
   FIREBASE INIT
====================== */
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
const messaging = getMessaging(app);

/* ======================
   GLOBAL
====================== */
window.db = db;
window.messaging = messaging;

/* ======================
   DOM
====================== */
const calendar = document.getElementById("calendar");
const monthTitle = document.getElementById("monthTitle");
const popup = document.getElementById("popup");

/* ======================
   VARIABILI
====================== */
let currentDate = new Date();
let savedEvents = [];
let editingEvent = null;
let CURRENT_USER = null;

/* ======================
   MAPPATURA UTENTI (ID UNICO)
====================== */
const users = {
  "A": { name: "SANTILLO", email: "paolosantillo@yahoo.it", role: "ADMIN" },
  "B": { name: "MANUNTA", email: "dipb.planner@gmail.com", role: "USER" },
  "C": { name: "Dipendente C", email: "dipc.planner@gmail.com", role: "USER" },
  "D": { name: "Dipendente D", email: "dipd.planner@gmail.com", role: "USER" }
};

function getUserByEmail(email) {
  return Object.entries(users).find(([id, u]) => u.email === email);
}

/* ======================
   AUTH
====================== */
onAuthStateChanged(window.auth, async (user) => {

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const found = getUserByEmail(user.email);

  if (!found) {
    alert("Utente non autorizzato");
    await window.auth.signOut();
    window.location.href = "login.html";
    return;
  }

  const [id, data] = found;

  CURRENT_USER = id;
  window.CURRENT_EMPLOYEE = id;
  window.IS_ADMIN = data.role === "ADMIN";

  document.getElementById("app").style.display = "block";

  loadEventsFromFirebase();
  renderCalendar();

  try {
    const token = await getToken(window.messaging, {
      vapidKey: "LA_TUA_VAPID_KEY"
    });

    await window.firebaseFirestore.setDoc(
      doc(db, "users", user.email),
      {
        email: user.email,
        employee: id,
        token
      },
      { merge: true }
    );

  } catch (e) {
    console.error(e);
  }
});

/* ======================
   FIREBASE LOAD EVENTS
====================== */
function loadEventsFromFirebase() {

  onSnapshot(collection(db, "events"), (snap) => {

    savedEvents = [];

    snap.forEach(d => {
      savedEvents.push({
        firebaseId: d.id,
        employeeId: d.data().employeeId,
        date: d.data().date,
        shift: d.data().shift
      });
    });

    renderCalendar();
  });
}

/* ======================
   CALENDAR
====================== */
window.renderCalendar = function () {

  calendar.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthTitle.innerText = `${year}`;

  const days = new Date(year, month + 1, 0).getDate();

  const holidays = [
    "1-1","6-1","25-4","1-5","2-6",
    "15-8","1-11","8-12","25-12","26-12"
  ];

  for (let d = 1; d <= days; d++) {

    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    const dayBox = document.createElement("div");
    dayBox.classList.add("day");

    const isSunday = new Date(year, month, d).getDay() === 0;
    const isHoliday = holidays.includes(`${d}-${month + 1}`);

    if (isSunday || isHoliday) {
      dayBox.classList.add("holiday-day");
    }

    const events = savedEvents.filter(e => e.date === date);

    events.forEach(ev => {

      const div = document.createElement("div");
      div.classList.add("event");

      if (ev.shift === "REP") div.classList.add("shift-pink");
      if (ev.shift === "FREP") div.classList.add("shift-pink");
      if (ev.shift === "CFI") div.classList.add("shift-green");
      if (ev.shift === "LIC" || ev.shift === "REC") div.classList.add("shift-yellow");

      div.innerText = ev.shift;

      dayBox.appendChild(div);
    });

    calendar.appendChild(dayBox);
  }
};

/* ======================
   SAVE SHIFT (NUOVO SISTEMA)
====================== */
window.saveShift = async function () {

  const employeeId = document.getElementById("employee").value;
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;
  const shift = document.getElementById("shift").value;

  if (!start || !end) return alert("Seleziona date");

  let current = new Date(start);
  const stop = new Date(end);

  while (current <= stop) {

    const date = current.toISOString().split("T")[0];

    const day = current.getDay();

    const holidays = ["1-1","6-1","25-4","1-5","2-6","15-8","1-11","8-12","25-12","26-12"];

    const isHoliday = holidays.includes(`${current.getDate()}-${current.getMonth() + 1}`);
    const isFestive = day === 0 || isHoliday;

    let finalShift = shift;

    // AUTO FREP
    if (shift === "REP") {
      finalShift = isFestive ? "FREP" : "REP";
    }

    // LIMIT REP
    if (finalShift === "REP") {
      const count = savedEvents.filter(e =>
        e.employeeId === employeeId &&
        e.shift === "REP" &&
        e.date.startsWith(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`)
      ).length;

      if (count >= 6) return alert("Max 6 REP");
    }

    // LIMIT FREP
    if (finalShift === "FREP") {
      if (!isFestive) return alert("FREP solo festivi");

      const count = savedEvents.filter(e =>
        e.employeeId === employeeId &&
        e.shift === "FREP"
      ).length;

      if (count >= 2) return alert("Max 2 FREP");
    }

    await addDoc(collection(db, "events"), {
      employeeId,
      date,
      shift: finalShift
    });

    current.setDate(current.getDate() + 1);
  }

  closePopup();
};

/* ======================
   POPUP
====================== */
window.openPopup = () => popup.style.display = "flex";
window.closePopup = () => popup.style.display = "none";
