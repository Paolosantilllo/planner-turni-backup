/* ======================
   IMPORT MODULI
====================== */

import { initAuth } from "./auth.js";
import { db, firestore } from "./firebase.js";

/* ======================
   STATO APP
====================== */

let currentDate = new Date();
let savedEvents = [];

const calendar = document.getElementById("calendar");
const monthTitle = document.getElementById("monthTitle");

/* ======================
   AVVIO APP DOPO LOGIN
====================== */

initAuth(() => {

  loadEvents();
  renderCalendar();

});

/* ======================
   CARICA EVENTI FIREBASE
====================== */

function loadEvents(){

  firestore.onSnapshot(
    firestore.collection(db, "events"),
    (snap) => {

      savedEvents = [];

      snap.forEach(doc => {
        savedEvents.push({
          id: doc.id,
          ...doc.data()
        });
      });

      renderCalendar();

    }
  );

}

/* ======================
   RENDER CALENDARIO BASE
====================== */

window.renderCalendar = function(){

  calendar.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
    "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"
  ];

  monthTitle.innerText = `${monthNames[month]} ${year}`;

  const daysInMonth = new Date(year, month+1, 0).getDate();

  for(let day = 1; day <= daysInMonth; day++){

    const date = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

    const box = document.createElement("div");
    box.classList.add("day");

    const events = savedEvents.filter(e => e.date === date);

    // numero giorno
    const num = document.createElement("div");
    num.classList.add("day-number");
    num.innerText = day;
    box.appendChild(num);

  // eventi
events.forEach(ev => {

  const el = document.createElement("div");

  el.classList.add("event");

  if (ev.employee === "A") {
    el.classList.add("dipendente-santillo");
  }

  if (ev.employee === "B") {
    el.classList.add("dipendente-b");
  }

  if (ev.employee === "C") {
    el.classList.add("dipendente-c");
  }

  if (ev.employee === "D") {
    el.classList.add("dipendente-d");
  }

  el.innerText = ev.shift;

  box.appendChild(el);

});

calendar.appendChild(box);

  }

};

/* ======================
   NAVIGAZIONE MESI
====================== */

window.nextMonth = function(){
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  renderCalendar();
};

window.prevMonth = function(){
  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  renderCalendar();
};

/* ======================
   POPUP BASE
====================== */

window.openPopup = function(){
  document.getElementById("popup").style.display = "flex";
};

window.closePopup = function(){
  document.getElementById("popup").style.display = "none";
};

const params = new URLSearchParams(window.location.search);
const requestIdFromUrl = params.get("requestId");

if (requestIdFromUrl) {

  console.log("🔔 Apertura da notifica:", requestIdFromUrl);

  openRequestFromNotification(requestIdFromUrl);

}
function openRequestFromNotification(requestId) {

  if (!requestId) return;

  console.log("📩 Apertura notifica:", requestId);

  // 👇 QUI VA IL CHECK
  if (!savedEvents.length) {
    console.log("⏳ Eventi non ancora caricati");
    return;
  }

  const event = savedEvents.find(e => e.id === requestId);

  if (!event) {
    console.log("❌ Evento non trovato");
    return;
  }

  document.getElementById("popup").style.display = "flex";

  console.log("📌 Evento aperto:", event);
}
