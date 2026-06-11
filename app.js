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
   FESTIVI
====================== */

const holidays = [
  "1-1","6-1","25-4","1-5","2-6",
  "15-8","1-11","8-12","25-12","26-12"
];

/* ======================
   INFO GIORNO
====================== */

function getDayInfo(dateStr) {

  const d = new Date(dateStr);

  const day = d.getDay();      // 0 = domenica
  const dayNum = d.getDate();  // giorno numero
  const month = d.getMonth() + 1;

  const isHoliday = holidays.includes(`${dayNum}-${month}`);

  return {
    isSunday: day === 0,
    isWeekday: day >= 1 && day <= 6,
    isHoliday: isHoliday
  };

}

window.validateShift = function(events, employee, date, shift) {

  const info = getDayInfo(date);

  const sameDayEvents = events.filter(e => e.date === date);

  const alreadyTaken = sameDayEvents.some(e => e.shift === shift);

  if (alreadyTaken) {
    return {
      ok: false,
      message: `❌ Esiste già un ${shift} in questo giorno`
    };
  }

  if (shift === "REP") {

    if (!info.isWeekday) {
      return {
        ok: false,
        message: "REP solo lunedì-sabato"
      };
    }

    const monthlyCount = events.filter(e =>
      e.employee === employee &&
      e.shift === "REP" &&
      new Date(e.date).getMonth() === new Date(date).getMonth()
    ).length;

    if (monthlyCount >= 6) {
      return {
        ok: false,
        message: "Max 6 REP al mese"
      };
    }
  }

  if (shift === "FREP") {

    if (!info.isSunday && !info.isHoliday) {
      return {
        ok: false,
        message: "FREP solo domenica e festivi"
      };
    }

    const monthlyCount = events.filter(e =>
      e.employee === employee &&
      e.shift === "FREP" &&
      new Date(e.date).getMonth() === new Date(date).getMonth()
    ).length;

    if (monthlyCount >= 2) {
      return {
        ok: false,
        message: "Max 2 FREP al mese"
      };
    }
  }

  return {
    ok: true,
    finalShift: shift
  };
};


/* ======================
   CHECK FESTIVI
====================== */

function isHoliday(dateStr){

  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d.getMonth() + 1;

  return holidays.includes(`${day}-${month}`);
}

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
   RENDER CALENDARIO
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

const daysInMonth = new Date(year, month + 1, 0).getDate();

const firstDay = new Date(year, month, 1).getDay();

const startOffset = firstDay === 0 ? 6 : firstDay - 1;

for(let i = 0; i < startOffset; i++){

  const empty = document.createElement("div");
  empty.classList.add("day", "empty-day");

  calendar.appendChild(empty);

}

for(let day = 1; day <= daysInMonth; day++){
    const date = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

    const box = document.createElement("div");
    box.classList.add("day");

    box.style.cursor = "pointer";

    box.onclick = () => openPopupWithDate(date);

    const events = savedEvents.filter(e => e.date === date);

    const num = document.createElement("div");
    num.classList.add("day-number");

    if (isHoliday(date)) {
      num.style.color = "red";
      num.style.fontWeight = "800";
    }

    num.innerText = day;
    box.appendChild(num);

    events.forEach(ev => {

      const el = document.createElement("div");
      el.classList.add("event");

      if (ev.employee === "A") el.classList.add("dipendente-santillo");
      if (ev.employee === "B") el.classList.add("dipendente-b");
      if (ev.employee === "C") el.classList.add("dipendente-c");
      if (ev.employee === "D") el.classList.add("dipendente-d");

      if (ev.shift === "LIC") {
        el.classList.add("lic-text");
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
   POPUP
====================== */

window.openPopup = function(){
  document.getElementById("popup").style.display = "flex";
};

window.closePopup = function(){
  document.getElementById("popup").style.display = "none";
};

window.openPopupWithDate = function(date){

  document.getElementById("startDate").value = date;
  document.getElementById("endDate").value = date;

  document.getElementById("popup").style.display = "flex";
};

/* ======================
   SALVATAGGIO
====================== */

window.saveShift = async function () {

  const employee = document.getElementById("employee").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const shift = document.getElementById("shift").value;

  if (!employee || !startDate || !shift) {
    alert("Compila tutti i campi");
    return;
  }

  console.log({ employee, startDate, endDate, shift });

  try {

    await firestore.addDoc(
      firestore.collection(db, "events"),
      {
        employee,
        date: startDate,
        endDate: endDate,
        shift,
        createdAt: new Date()
      }
    );

    closePopup();

    console.log("✔ Salvataggio completato");

  } catch (err) {
    console.error("Errore salvataggio:", err);
  }
};

/* ======================
   NOTIFICHE
====================== */

const params = new URLSearchParams(window.location.search);
const requestIdFromUrl = params.get("requestId");

if (requestIdFromUrl) {
  openRequestFromNotification(requestIdFromUrl);
}

function openRequestFromNotification(requestId){

  if (!requestId) return;

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
