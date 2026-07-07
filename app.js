
 /* ======================
   IMPORT MODULI
====================== */

import { initAuth, logout, CURRENT_EMPLOYEE } from "./auth.js";
import { db, firestore } from "./firebase.js";

import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  setDoc,
  deleteDoc,
  addDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { EMPLOYEES, SHIFT_COLORS } from "./employees.js";

import {
  initPush,
  listenForegroundNotifications
} from "./push.js";

/* ======================
   FIREBASE AUTH (NUOVO)
====================== */

import { auth } from "./firebase.js";
import { createUserWithEmailAndPassword } 
from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

window.logout = logout;

/* ======================
   INIT AUTH
====================== */

initAuth(async (user) => {

  window.CURRENT_USER = user;

  // 🔥 prendo dipendente da UID Firebase
 const q = query(
  collection(db, "employees"),
  where("uid", "==", user.uid)
);

const snap = await getDocs(q);

 console.log("UID LOGIN:", user.uid);
console.log("DOCUMENTI TROVATI:", snap.docs.map(d => d.data()));
 
if (snap.empty) {
  alert("Utente non registrato come dipendente");
  return;
}

const employee = snap.docs[0].data();

window.CURRENT_EMPLOYEE = employee.code;
window.CURRENT_EMPLOYEE_DATA = employee;

window.IS_ADMIN = employee.role === "ADMIN";

  document.getElementById("app").classList.add("show");

  await populateEmployeeSelects();
  setDefaultFilter();
  loadEvents();
  loadChangeRequests();
  loadNotificationBadge();

  setupAdminUI();

  initPush(user);
  listenForegroundNotifications();

});
/* ======================
   STATO APP
====================== */

let currentDate = new Date();
let savedEvents = [];

let unsubscribeEvents = null;
let eventsByDate = {};

window.employeesData = window.employeesData || {};
const employeesData = window.employeesData;

let editingEmployeeId = null;

// ======================
// 📄 VERSIONI PDF
// ======================

window.pdfVersion = "1/1";
window.currentPdfKey = "";

window.currentPdfBlob = null;
window.currentPdfHash = null;
window.currentPdfMonths = 1;

const calendar = document.getElementById("calendar");
const monthTitle = document.getElementById("monthTitle");
const employeeFilter = document.getElementById("employeeFilter");
// ======================
// FORMATTAZIONE DATE
// ======================

function formatDateIT(date){

  if(!date) return "";

  const parts = date.split("-");

  if(parts.length !== 3) return date;

  return `${parts[2]}-${parts[1]}-${parts[0]}`;

}

// ======================
// 📄 VERSIONE PDF
// ======================

async function getPdfVersion(pdfKey) {

  const ref = doc(db, "pdfVersions", pdfKey);

  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return {
      version: 1,
      signature: null
    };
  }

  const data = snap.data();

  return {
    version: data.version || 1,
    signature: data.signature || null
  };

}

async function savePdfVersion(version, signature) {

  const ref = doc(db, "pdfVersions", window.currentPdfKey);

  await setDoc(ref, {

    version,

    signature,

    updatedAt: serverTimestamp()

  });

}
// ======================
// CARICA NOMINATIVI
// ======================

async function populateEmployeeSelects() {

  await loadEmployeesFromFirestore();

  const filter =
    document.getElementById("employeeFilter");

  const employee =
    document.getElementById("employee");

  if (filter) {

    filter.innerHTML =
      '<option value="ALL">Tutti</option>';

    Object.entries(employeesData).forEach(([id, emp]) => {

      filter.innerHTML += `
        <option value="${id}">
          ${emp.name}
        </option>
      `;

    });

  }

  if (employee) {

    employee.innerHTML = "";

    Object.entries(employeesData).forEach(([id, emp]) => {

      employee.innerHTML += `
        <option value="${id}">
          ${emp.name}
        </option>
      `;

    });

  }

}

employeeFilter.addEventListener("change", () => {
  renderCalendar();
});
// ======================
// FILTRO AUTOMATICO
// ======================

function setDefaultFilter() {

  const role =
    EMPLOYEES[window.CURRENT_EMPLOYEE]?.role;

  // Admin e Santillo vedono tutti
  if (
    role === "ADMIN" ||
    window.CURRENT_EMPLOYEE === "A"
  ) {

    employeeFilter.value = "ALL";
    return;
  }

  // Tutti gli altri vedono se stessi
  employeeFilter.value = CURRENT_EMPLOYEE;
}


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
  const day = d.getDay();      
  const dayNum = d.getDate();
  const month = d.getMonth() + 1;

  const isHoliday = holidays.includes(`${dayNum}-${month}`);

  return {
    isSunday: day === 0,
    isWeekday: day >= 1 && day <= 6,
    isHoliday
  };
}

window.validateShift = function(events, employee, date, shift) {

  const info = getDayInfo(date);

  const sameDayEvents = events.filter(e => e.date === date);

  // ======================
  // CONTROLLO COPERTURA GIORNALIERA
  // ======================

  const repExists = sameDayEvents.some(
    e => e.shift === "REP" || e.shift === "CFI/REP"
  );

  const frepExists = sameDayEvents.some(
    e => e.shift === "FREP" || e.shift === "CFI/REP"
  );

  // Giorni lavorativi
  if (!info.isSunday && !info.isHoliday) {

    if (
      (shift === "REP" || shift === "CFI/REP") &&
      repExists
    ) {
      return {
        ok: false,
        message: "❌ La reperibilità del giorno è già coperta"
      };
    }
  }

  // Domeniche e festivi
  if (info.isSunday || info.isHoliday) {

    if (
      (shift === "FREP" || shift === "CFI/REP") &&
      frepExists
    ) {
      return {
        ok: false,
        message: "❌ La reperibilità festiva è già coperta"
      };
    }
  }

// ======================
// REP RULES
// ======================

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
    new Date(e.date).getMonth() === new Date(date).getMonth() &&
    new Date(e.date).getFullYear() === new Date(date).getFullYear()
  ).length;

  if (monthlyCount >= 6) {
    return {
      ok: false,
      message: "Max 6 REP al mese"
    };
  }
}

// ======================
// FREP RULES
// ======================

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
    new Date(e.date).getMonth() === new Date(date).getMonth() &&
    new Date(e.date).getFullYear() === new Date(date).getFullYear()
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
   CARICA EVENTI FIREBASE
====================== */

function loadEvents() {

  // chiude il vecchio listener
  if (unsubscribeEvents) {
    unsubscribeEvents();
  }

  // mostra subito il calendario
  renderCalendar();

  unsubscribeEvents = firestore.onSnapshot(

    firestore.collection(db, "events"),

    (snap) => {

      savedEvents = [];
      eventsByDate = {};

      snap.forEach(doc => {

        const ev = {
          id: doc.id,
          ...doc.data()
        };

        savedEvents.push(ev);

        // indicizzazione per data
        if (!eventsByDate[ev.date]) {
          eventsByDate[ev.date] = [];
        }

        eventsByDate[ev.date].push(ev);

      });

      console.log(
        "EVENTI CARICATI:",
        savedEvents.length
      );

      renderCalendar();

    }

  );

}

// ======================
// 🔔 CARICA RICHIESTE CAMBIO
// ======================

window.loadChangeRequests = function(){

firestore.onSnapshot(

firestore.collection(db,"changeRequests"),

(snap)=>{


let requestCount = 0;


const isAdmin =
EMPLOYEES[CURRENT_EMPLOYEE]?.role === "ADMIN";


snap.forEach(doc=>{


const req = doc.data();



if(
req.toEmployee === CURRENT_EMPLOYEE &&
req.status === "PENDING_USER"
){

requestCount++;

console.log(
"RICHIESTA DIP:",
req.fromEmployee,
"→",
req.toEmployee
);

}



if(
isAdmin &&
req.status === "PENDING_ADMIN"
){

requestCount++;

console.log(
"RICHIESTA ADMIN:",
req.fromEmployee,
"→",
req.toEmployee
);

}


});



const requestBadge =
document.getElementById("requestBadge");


if(requestBadge){

requestBadge.innerText =
requestCount > 0
? requestCount
: "";

}



console.log(
"BADGE RICHIESTE:",
requestCount
);


}

);

};


window.loadNotificationBadge = function(){

firestore.onSnapshot(

  firestore.collection(db,"notifications"),

  (snap)=>{

    let count = 0;

    snap.forEach(doc=>{

      const n = doc.data();

      if(
 n.employee === CURRENT_EMPLOYEE &&
 n.read === false
){
 count++;
}

    });

    const badge =
      document.getElementById("notifBadge");

    if(badge){

      badge.innerText =
      count > 0
      ? count
      : "";

    }

  }

);

};



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

for (let day = 1; day <= daysInMonth; day++) {

  const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const selectedEmployee = employeeFilter.value;

let events = (eventsByDate[date] || []).filter(e => {

  if (selectedEmployee === "ALL") {
    return true;
  }

  return e.employee === selectedEmployee;

});

const box = document.createElement("div");
box.classList.add("day");
box.style.cursor = "pointer";
   
// ======================
// 📅 EVIDENZIA IL GIORNO ODIERNO
// ======================

const today = new Date();

const todayString =
`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

if (date === todayString) {

  box.classList.add("today");

  const day = new Date(date);
  const dayNumber = day.getDay();

  // Domenica
  if(dayNumber === 0){
    box.classList.add("sunday");
  }

  // Sabato
  if(dayNumber === 6){
    box.classList.add("saturday");
  }

}
   
   // ======================
// 🟣 CONTROLLO COPERTURA
// ======================

const dayInfo = getDayInfo(date);

let covered = false;

if (dayInfo.isSunday || dayInfo.isHoliday) {

  covered = events.some(ev =>
    ev.shift === "FREP" ||
    ev.shift === "CFI/REP"
  );

} else {

  covered = events.some(ev =>
    ev.shift === "REP" ||
    ev.shift === "CFI/REP"
  );

}


box.onclick = () => {
  if (!window.IS_ADMIN) return;
  openPopupWithDate(date, events);
};

const num = document.createElement("div");
num.classList.add("day-number");


// 🔴 domeniche + festivi
if (dayInfo.isSunday || dayInfo.isHoliday) {

  num.classList.add("day-red");

  // colora anche la cella
  box.classList.add("holiday-day");

}

num.innerText = day;

box.appendChild(num);


// ======================
// ORDINA NOMINATIVI A-B-C-D
// ======================

events.sort((a, b) => {

  const order = {
    A: 1,
    B: 2,
    C: 3,
    D: 4
  };

  return (order[a.employee] || 999) - (order[b.employee] || 999);

});

// ======================
// EVENTI DEL GIORNO
// ======================

events.forEach(ev => {


  if (!ev || !ev.employee || !ev.shift) return;


  const el = document.createElement("div");

  el.classList.add("event");


 const emp = employeesData[ev.employee];

if (selectedEmployee === "ALL") {

  // Colore del dipendente
  if (emp?.color) {
    el.style.backgroundColor = emp.color;
  }

} else {

  // Colore del turno
  const shiftKey = (ev.shift || "").trim();
  const color = SHIFT_COLORS[shiftKey];

  if (color) {
    el.style.backgroundColor = color;
  }

}

el.style.color = "#000";



// ======================
// COLORE TESTO TURNI
// ======================

if (dayInfo.isSunday || dayInfo.isHoliday) {

  // domeniche e festivi rosso
  el.style.color = "#ff3b30";

} else {

  // giorni normali nero
  el.style.color = "#000";

}


el.innerText = ev.shift;


box.appendChild(el);


});


calendar.appendChild(box);


}
};
  // ======================
 // NAVIGAZIONE MESI
 // ======================
window.nextMonth = function(){

  currentDate =
  new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    1
  );

  loadEvents();

};
window.prevMonth = function(){

  currentDate =
  new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() - 1,
    1
  );

  loadEvents();

};

/* ======================
   POPUP
====================== */

window.openPopup = function(){

  if (!window.IS_ADMIN) return;

  document.getElementById("popup").style.display = "flex";

};
window.closePopup = function(){
  document.getElementById("popup").style.display = "none";
};

window.openPopupWithDate = function(date, events = []) {

  document.getElementById("startDate").value = date;
  document.getElementById("endDate").value = date

  const employeeSelect = document.getElementById("employee");

  // se c’è un solo evento → autoselezione dipendente
  if (events.length === 1) {
    employeeSelect.value = events[0].employee;
  } else {
    employeeSelect.value = "";
  }

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

 if (!window.IS_ADMIN) {
  alert("Non autorizzato");
  return;
}
   
   if (!employee || !startDate || !shift) {
    alert("Compila tutti i campi");
    return;
  }

  const start = new Date(startDate);
  const end = new Date(endDate || startDate);

  try {

const writes = [];

// Contatori dei turni aggiunti in questa operazione
let addedREP = 0;
let addedFREP = 0;

for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
  const dateStr = d.toISOString().split("T")[0];

  const month = d.getMonth();   // 👈 QUI VA MESSO

  const info = getDayInfo(dateStr);
     
 const sameDay = savedEvents.filter(e => e.date === dateStr);

  const repExists = sameDay.some(
  e => e.shift === "REP" || e.shift === "CFI/REP"
);

const frepExists = sameDay.some(
  e => e.shift === "FREP" || e.shift === "CFI/REP"
);

 // ======================
// 🔥 CONTROLLO ATTIVITÀ DIPENDENTE
// ======================

const employeeEvents = sameDay.filter(
  e => e.employee === employee
);


if (employeeEvents.length > 0) {


  const existingShifts =
  employeeEvents.map(e => e.shift);



  const hasREP =
  existingShifts.includes("REP");


  const hasREC =
  existingShifts.includes("REC");



  // unica combinazione consentita REP + REC

  const allowedCombo =
    (shift === "REP" && hasREC) ||
    (shift === "REC" && hasREP);



  if(!allowedCombo){

    alert(
      `❌ ${employee} ha già un'attività il ${dateStr}`
    );

    return;

  }

}

 // ======================
// CONTROLLO COPERTURA GIORNALIERA
// ======================

// Lunedì-Sabato non festivi
if (!info.isSunday && !info.isHoliday) {

  if (
    (shift === "REP" || shift === "CFI/REP") &&
    repExists
  ) {
    alert("❌ Esiste già una reperibilità REP in questo giorno");
    return;
  }

}

// Domeniche e Festivi
if (info.isSunday || info.isHoliday) {

  if (
    (shift === "FREP" || shift === "CFI/REP") &&
    frepExists
  ) {
    alert("❌ Esiste già una reperibilità FREP in questo giorno");
    return;
  }

}

  // =========================
  // 🔥 AUTO CONVERSIONE REP → FREP
  // =========================
 let finalShift = shift;

if (shift === "REP") {
  if (!info.isWeekday || info.isHoliday) {
    finalShift = "FREP";
  }
}

// ======================
// CONTROLLO COPERTURA DOPO CONVERSIONE
// ======================

const repCoverageExists = sameDay.some(
  e => e.shift === "REP" || e.shift === "CFI/REP"
);

const frepCoverageExists = sameDay.some(
  e => e.shift === "FREP" || e.shift === "CFI/REP"
);

// Giorni lavorativi
if (!info.isSunday && !info.isHoliday) {

  if (
    (finalShift === "REP" || finalShift === "CFI/REP") &&
    repCoverageExists
  ) {

    alert("❌ La reperibilità del giorno è già coperta");
    return;

  }
}

// Festivi e domeniche
if (info.isSunday || info.isHoliday) {

  if (
    (finalShift === "FREP" || finalShift === "CFI/REP") &&
    frepCoverageExists
  ) {

    alert("❌ La reperibilità festiva è già coperta");
    return;

  }
}
       
/* ======================
   🔴 REP RULES
====================== */
if (finalShift === "REP") {

 const monthly = savedEvents.filter(e =>
  e.employee === employee &&
  e.shift === "REP" &&
  new Date(e.date).getMonth() === d.getMonth() &&
  new Date(e.date).getFullYear() === d.getFullYear()
).length + addedREP;

if (monthly >= 6) {
  alert("Max 6 REP al mese");
  return;
}
}

/* ======================
   🔵 FREP RULES
====================== */
if (finalShift === "FREP") {

  if (!info.isSunday && !info.isHoliday) {
    alert("FREP consentito solo domeniche e festivi");
    return;
  }

  const monthly = savedEvents.filter(e =>
  e.employee === employee &&
  e.shift === "FREP" &&
  new Date(e.date).getMonth() === d.getMonth() &&
  new Date(e.date).getFullYear() === d.getFullYear()
).length + addedFREP;

  if (monthly >=2) {
    alert("Max 2 FREP al mese");
    return;
  }
}

   if (finalShift === "REP") {
  addedREP++;
}

if (finalShift === "FREP") {
  addedFREP++;
}
   
   writes.push(
    firestore.addDoc(
      firestore.collection(db, "events"),
      {
        employee,
        date: dateStr,
        shift: finalShift,   // 👈 IMPORTANTE
        createdAt: new Date()
      }
    )
  );
}
    await Promise.all(writes);

    closePopup();
    console.log("✔ Salvataggio completato");

  } catch (err) {
    console.error(err);
  }
};



// ======================
// 🗑️ NUOVA FUNZIONE DELETE SHIFT
// ======================

window.deleteShift = async function () {

  const employee = document.getElementById("employee").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

 if (!window.IS_ADMIN) {
  alert("Non autorizzato");
  return;
}
   
   if (!employee || !startDate) {
    alert("Seleziona dipendente e data");
    return;
  }

  const start = new Date(startDate);
  const end = new Date(endDate || startDate);

  try {

    const toDelete = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {

      const dateStr = d.toISOString().split("T")[0];

      savedEvents
        .filter(e => e.date === dateStr && e.employee === employee)
        .forEach(e => {
          toDelete.push(
            firestore.deleteDoc(
              firestore.doc(db, "events", e.id)
            )
          );
        });

    }

    await Promise.all(toDelete);

    closePopup();

    console.log("✔ Eliminazione completata");

  } catch (err) {
    console.error("Errore eliminazione:", err);
  }
};

  // ======================
// 🖼️ RENDER ANTEPRIMA PDF
// ======================

async function renderPdfPreview(blob) {

  const canvas = document.getElementById("pdfCanvas");
  if (!canvas) return;

  const pdfjsLib = window["pdfjsLib"];

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const arrayBuffer = await blob.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer
  }).promise;

  const page = await pdf.getPage(1);

  const viewport = page.getViewport({
    scale: 1.5
  });

  const context = canvas.getContext("2d");

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: context,
    viewport
  }).promise;
}

// ======================
// 📄 APRE ANTEPRIMA PDF
// ======================

async function openPdfPreview(pdf, fileName){

  const blob = pdf.output("blob");

  window.currentPdfBlob = blob;
  window.currentPdfName = fileName;

  const pdfPopup = document.getElementById("pdfPopup");

  if(pdfPopup){
    pdfPopup.style.display = "flex";
  }

  await renderPdfPreview(blob);

}
// ======================
//  📤 PDF EXPORT
// ======================

async function generatePDF(months = 1) {
  
   window.currentPdfMonths = months;
   const missingMessages = [];

  const baseYear = currentDate.getFullYear();
  const baseMonth = currentDate.getMonth();


   
// ======================
// 📄 CHIAVE VERSIONE PDF
// ======================

const snapshot = [];

for (let m = 0; m < months; m++) {

  const monthDate = new Date(baseYear, baseMonth + m, 1);

  snapshot.push(
    `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`
  );

}

const pdfKey = snapshot.join("_");

window.currentPdfKey = pdfKey;

// Recupera informazioni versione
const pdfInfo = await getPdfVersion(pdfKey);

// La versione da stampare nel PDF
window.pdfVersion = `1/${pdfInfo.version}`;

// Salva anche le informazioni complete per usarle in sharePdf()
window.currentPdfInfo = pdfInfo;
   
   const daysInMonth =
    new Date(baseYear, baseMonth + 1, 0).getDate();

  // ======================
  // 🔍 CONTROLLO COPERTURA
  // ======================
  for (let d = 1; d <= daysInMonth; d++) {

    const date =
      `${baseYear}-${String(baseMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    const info = getDayInfo(date);

    const hasCoverage = savedEvents.some(ev => {
      if (ev.date !== date) return false;

      if (info.isSunday || info.isHoliday) {
        return ev.shift === "FREP" || ev.shift === "CFI/REP";
      }

      return ev.shift === "REP" || ev.shift === "CFI/REP";
    });

 if (!hasCoverage) {

  missingMessages.push(
    formatDateIT(date)
  );

    }
    
  }

  if (missingMessages.length > 0) {
    const proceed = confirm(
      "⚠️ Mancano reperibilità:\n\n" +
      missingMessages.join("\n") +
      "\n\nContinuare?"
    );

    if (!proceed) return;
  }

  // ======================
  // 📄 PDF INIT
  // ======================
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
  orientation: "landscape",
  unit: "mm",
  format: "a4"
});

  const monthNames = [
    "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
    "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"
  ];

  const map = ["D","L","Ma","Me","G","V","S"];

  const monthsToPrint = Number(months);
  let startY = 20;

  // ======================
  // 🔁 LOOP MESI
  // ======================
  for (let m = 0; m < monthsToPrint; m++) {

    const dateObj = new Date(baseYear, baseMonth + m, 1);

    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();

    const daysInMonthLoop = new Date(year, month + 1, 0).getDate();

    const uncoveredDays = new Set();

    for (let d = 1; d <= daysInMonthLoop; d++) {

      const dateStr =
        `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      const info = getDayInfo(dateStr);

      const hasCoverage = savedEvents.some(ev => {
        if (ev.date !== dateStr) return false;

        if (info.isSunday || info.isHoliday) {
          return ev.shift === "FREP" || ev.shift === "CFI/REP";
        }

        return ev.shift === "REP" || ev.shift === "CFI/REP";
      });

      if (!hasCoverage) uncoveredDays.add(d);
    }

 // ======================
// 📌 TITOLO + DATA + VERSIONE
// ======================

pdf.setFontSize(12);
pdf.setFont("helvetica", "bold");

pdf.text(
  `Reperibilità specialisti PLF del mese di ${monthNames[month].toUpperCase()} ${year}`,
  148,
  startY,
  { align: "center" }
);

   // ======================
// 📌 INFO INVIO PDF
// ======================

pdf.setFontSize(8);
pdf.setFont("helvetica", "normal");


const now = new Date();


const dataInvio =
now.toLocaleDateString("it-IT")
+
" "
+
now.toLocaleTimeString("it-IT");


pdf.text(
  `Data invio: ${dataInvio}`,
  285,
  8,
  {
    align:"right"
  }
);


pdf.text(
  `Versione: ${window.pdfVersion || "1/1"}`,
  285,
  13,
  {
    align:"right"
  }
);
     
     // ======================
    // 📊 TABELLA
    // ======================
    const head = [
      ["Nominativi", ...Array.from({ length: daysInMonthLoop }, (_, i) => i + 1)]
    ];

    const weekdayRow = [
      "",
      ...Array.from({ length: daysInMonthLoop }, (_, i) => {
        const d = i + 1;
        return map[new Date(year, month, d).getDay()];
      })
    ];

   const nominativi = Object.keys(employeesData);

const body = nominativi.map(id => {
  const row = [employeesData[id].name];

      for (let d = 1; d <= daysInMonthLoop; d++) {

        const dateStr =
          `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

       const employeeId = id;

const ev = savedEvents.find(e =>
  e.date === dateStr && e.employee === employeeId
);

        row.push(ev ? ev.shift : "");
      }

      return row;
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const nameColWidth = 22;
    const usableWidth = pageWidth - nameColWidth - 10;
    const dayColWidth = usableWidth / daysInMonthLoop;

    const columnStyles = { 0: { cellWidth: nameColWidth } };

    for (let i = 1; i <= daysInMonthLoop; i++) {
      columnStyles[i] = { cellWidth: dayColWidth };
    }

    pdf.autoTable({
      head,
      body: [weekdayRow, ...body],
      startY,
      theme: "grid",

headStyles: {
  fillColor: [255,255,255],
  textColor: [0,0,0],
  lineColor: [0,0,0],
  lineWidth: 0.1
},
       
      tableWidth: "auto",
      margin: { left: 3, right: 3 },
      styles: {
        fontSize: 3.8,
        cellPadding: 0.15,
        halign: "center",
        valign: "middle",
         overflow: "hidden"
      },
      columnStyles,

      didParseCell: function (data) {

  const colIndex = data.column.index;
  const value = data.cell.raw;

  // ======================
  // HEADER (NOMINATIVI + NUMERI)
  // ======================
  if (data.section === "head") {

    if (colIndex === 0) {
      data.cell.styles.fillColor = [255,255,255];
      return;
    }

    const dayNumber = colIndex;

    const dDate = new Date(year, month, dayNumber);
    const weekday = dDate.getDay();

    const info = getDayInfo(
      `${year}-${String(month + 1).padStart(2,"0")}-${String(dayNumber).padStart(2,"0")}`
    );

    // 🔴 Domeniche e Festivi
    if (weekday === 0 || info.isHoliday) {
      data.cell.styles.fillColor = [255,59,48];
      data.cell.styles.textColor = [255,255,255];
      return;
    }

    // 🟠 Sabato
    if (weekday === 6) {
      data.cell.styles.fillColor = [255,149,0];
      data.cell.styles.textColor = [255,255,255];
      return;
    }

    return;
  }

  // ======================
  // RIGA GIORNI SETTIMANA
  // ======================
  if (data.section === "body" && data.row.index === 0) {

    const dayNumber = colIndex;

    if (colIndex === 0) {
      data.cell.styles.fillColor = [255,255,255];
      return;
    }

    const dDate = new Date(year, month, dayNumber);
    const weekday = dDate.getDay();

    const info = getDayInfo(
      `${year}-${String(month + 1).padStart(2,"0")}-${String(dayNumber).padStart(2,"0")}`
    );

    // 🔴 D e Festivi
    if (weekday === 0 || info.isHoliday) {
      data.cell.styles.fillColor = [255,59,48];
      data.cell.styles.textColor = [255,255,255];
      return;
    }

    // 🟠 S
    if (weekday === 6) {
      data.cell.styles.fillColor = [255,149,0];
      data.cell.styles.textColor = [255,255,255];
      return;
    }

    return;
  }

  // ======================
  // RIGHE NOMINATIVI
  // ======================
  if (data.section === "body") {

  const dayNumber = colIndex;

  if (colIndex === 0) {
    data.cell.styles.fillColor = [255,255,255];
    return;
  }

  const value = data.cell.raw;

  const dDate = new Date(year, month, dayNumber);
  const weekday = dDate.getDay();

  const info = getDayInfo(
    `${year}-${String(month + 1).padStart(2,"0")}-${String(dayNumber).padStart(2,"0")}`
  );

 // ======================
// 🟣 GIORNI SCOPERTI (PRIORITÀ MASSIMA)
// ======================

if ((!value || value === "") && uncoveredDays.has(dayNumber)) {

  data.cell.styles.fillColor = [180,120,255];
  data.cell.styles.textColor = [255,255,255];
  return;

}

// ======================
// 🟠🔴 WEEKEND (SOLO SE CELLA VUOTA)
// ======================

if (!value || value === "") {

  // 🔴 Domenica / festivi
  if (weekday === 0 || info.isHoliday) {
    data.cell.styles.fillColor = [255,59,48];
    data.cell.styles.textColor = [255,255,255];
    return;
  }

  // 🟠 Sabato
  if (weekday === 6) {
    data.cell.styles.fillColor = [255,149,0];
    data.cell.styles.textColor = [255,255,255];
    return;
  }

}

  // ======================
  // 🟢 CFI
  // ======================
  if (value === "CFI" || value === "CFI/REP") {
    data.cell.styles.fillColor = [102,187,106];
    return;
  }

// 🟤 REP
if (value === "REP" || value === "FREP") {
  data.cell.styles.fillColor = [220, 200, 190];
  return;
}

  // 🟡 LIC / REC
  if (value === "LIC" || value === "REC") {
    data.cell.styles.fillColor = [255,235,59];
    return;
  }

  // ⚪ MAL
  if (value === "MAL") {
    data.cell.styles.fillColor = [238,238,238];
    return;
  }
}
}
    });

    if (m < monthsToPrint - 1) {
      startY = pdf.lastAutoTable.finalY + 10;
    }
  }

// ======================
// 📤 ANTEPRIMA PDF
// ======================

await openPdfPreview(
  pdf,
  `Reperibilita_${baseYear}_${String(baseMonth + 1).padStart(2, "0")}.pdf`
);
 }

// ======================
// BOTTONE PDF
// ======================

window.addEventListener("DOMContentLoaded", () => {

  const btn = document.getElementById("pdfBtn");

  if(btn){

    btn.addEventListener("click",()=>{

      document.getElementById("monthsPopup").style.display="flex";

    });

  }

});


window.closeMonthsPopup = function(){

  document.getElementById("monthsPopup").style.display="none";

};



window.confirmPdfExport = function(){

  const months = parseInt(
    document.getElementById("monthsRange").value
  );


  closeMonthsPopup();


  generatePDF(months);

};


// ======================
// ❌ CHIUDI PDF POPUP
// ======================

window.closePdfPopup = function(){

  const popup =
  document.getElementById("pdfPopup");

  if(popup){
    popup.style.display = "none";
  }

};
// ======================
// 🔁 CAMBIO REPERIBILITA'
// ======================

window.openChangePopup = function () {

  loadChangeEmployees();

  loadChangeDays();

  const popup = document.getElementById("changePopup");

  if (!popup) {
    console.error("changePopup non trovato");
    return;
  }


  // chiude centro notifiche se aperto
  const requestsPopup =
    document.getElementById("changeRequestsPopup");

  if(requestsPopup){
    requestsPopup.style.display = "none";
  }


  // apre cambio reperibilità
  popup.style.display = "flex";

};

window.closeChangePopup = function () {

  document.getElementById("changePopup").style.display = "none";

};

// ======================
// MINI CALENDARI CAMBIO
// ======================

window.loadChangeDays = function () {

  const fromEmployee = CURRENT_EMPLOYEE;

  const toEmployee =
    document.getElementById("changeTo").value;

  const selectedShift =
    document.getElementById("changeShift").value;

  const calFrom =
    document.getElementById("miniGridFrom");

  const calTo =
    document.getElementById("miniGridTo");

  if (!calFrom || !calTo) return;

  calFrom.innerHTML = "";
  calTo.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth =
    new Date(year, month + 1, 0).getDate();

  const fromEvents =
    savedEvents.filter(ev =>
      ev.employee === fromEmployee &&
      ev.shift === selectedShift
    );

  const toEvents =
    savedEvents.filter(ev =>
      ev.employee === toEmployee &&
      ev.shift === selectedShift
    );

  function buildCalendar(container, events, isFrom) {

    const firstDay =
      new Date(year, month, 1).getDay();

    let startDay = firstDay - 1;

    if (startDay < 0) {
      startDay = 6;
    }

    for (let i = 0; i < startDay; i++) {

      const empty = document.createElement("div");

      empty.classList.add(
        "mini-day",
        "disabled"
      );

      container.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {

      const iso =
        `${year}-${String(month + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

      const div =
        document.createElement("div");

      div.classList.add("mini-day");
      div.innerText = d;

      const hasEvent =
        events.some(ev => ev.date === iso);

      if (!hasEvent) {
        div.classList.add("disabled");
      }

      div.onclick = () => {

  if (!hasEvent) return;

  if (isFrom) {

    window.selectedFromDate = iso;

    document.getElementById("selectedFromText").innerText = iso;

    // 🔥 chiudi subito calendario FROM
    document.getElementById("changeCalendarFrom")
      ?.classList.add("hidden-calendar");

  } else {

    window.selectedToDate = iso;

    document.getElementById("selectedToText").innerText = iso;

    // 🔥 chiudi subito calendario TO
    document.getElementById("changeCalendarTo")
      ?.classList.add("hidden-calendar");
  }
};
      container.appendChild(div);
    }
  }

  buildCalendar(
    calFrom,
    fromEvents,
    true
  );

  buildCalendar(
    calTo,
    toEvents,
    false
  );
};

// ======================
// TOGGLE MINI CALENDARI
// ======================

window.toggleMiniCalendar = function(type){

  const fromCal =
    document.getElementById(
      "changeCalendarFrom"
    );

  const toCal =
    document.getElementById(
      "changeCalendarTo"
    );

  if(type === "from"){

    fromCal.classList.toggle(
      "hidden-calendar"
    );

    toCal.classList.add(
      "hidden-calendar"
    );
  }

  if(type === "to"){

    toCal.classList.toggle(
      "hidden-calendar"
    );

    fromCal.classList.add(
      "hidden-calendar"
    );
  }
};

function loadChangeEmployees() {

  const select = document.getElementById("changeTo");

  select.innerHTML = "";

  Object.keys(employeesData).forEach(emp => {

    if (emp === CURRENT_EMPLOYEE) return;

    const option = document.createElement("option");

    option.value = emp;
    option.textContent = employeesData[emp].name;

    select.appendChild(option);

  });

}

// ======================
// 📩 INVIA RICHIESTA CAMBIO
// ======================

window.sendChangeRequest = async function(){

  const toEmployee =
    document.getElementById("changeTo").value;


  const shift =
    document.getElementById("changeShift").value;

// ======================
// 🚫 BLOCCO DATE PASSATE
// ======================

const today = new Date();
today.setHours(0,0,0,0);

if (!window.selectedFromDate || !window.selectedToDate) {
  alert("Seleziona giorno da dare e giorno da ricevere");
  return;
}

const fromDateObj = new Date(window.selectedFromDate + "T00:00:00");
const toDateObj = new Date(window.selectedToDate + "T00:00:00");

if (fromDateObj < today || toDateObj < today) {
  alert("❌ Non puoi richiedere un cambio con date già trascorse");
  return;
}

try {
  await firestore.addDoc(
    firestore.collection(db, "changeRequests"),
    {
      fromEmployee: CURRENT_EMPLOYEE,
      toEmployee: toEmployee,
      fromDate: window.selectedFromDate,
      toDate: window.selectedToDate,
      shift: shift,
      status: "PENDING_USER",
      createdAt: new Date()
    }
  );

  alert("✅ Richiesta inviata");
  closeChangePopup();

}catch(err){

console.error(
"Errore invio richiesta:",
err
);

}
};

// ======================
// 🔔 APRI POPUP NOTIFICHE
// ======================

window.openRequestsPopup = function(){

  const popup =
    document.getElementById("changeRequestsPopup");

  if(!popup){
    console.error("requestsPopup non trovato");
    return;
  }

  popup.style.display = "flex";

  if(!window.requestsLoaded){
    loadRequestsList();
    window.requestsLoaded = true;
  }

};



// ======================
// 🔔 APRI SOLO NOTIFICHE
// ======================

window.openNotificationsPopup = function(){

  const popup =
    document.getElementById("notificationsPopup");


  if(!popup){
    console.error("notificationsPopup non trovato");
    return;
  }


  popup.style.display = "flex";


  if(!window.notificationsLoaded){

    loadOnlyNotifications();

    window.notificationsLoaded = true;

  }

};

// ======================
// ❌ CHIUDI SOLO NOTIFICHE
// ======================

window.closeNotificationsPopup = function(){

  const popup =
    document.getElementById("notificationsPopup");

  if(popup){

    popup.style.display = "none";

  }

};

window.readNotification = async function(notificationId){

  try{

    await firestore.deleteDoc(
      firestore.doc(
        db,
        "notifications",
        notificationId
      )
    );

    console.log("✅ Notifica eliminata");

  }catch(err){

    console.error(
      "Errore eliminazione notifica:",
      err
    );

  }

};

// ======================
// 🔔 CARICA SOLO NOTIFICHE
// ======================

window.loadOnlyNotifications = function(){


const list =
document.getElementById("notificationsOnlyList");


if(!list){
  console.error("notificationsOnlyList non trovato");
  return;
}


list.innerHTML = "Caricamento...";


firestore.onSnapshot(

firestore.collection(db,"notifications"),

(snap)=>{


list.innerHTML = "";


snap.forEach(doc=>{


const n = doc.data();


if(n.employee !== CURRENT_EMPLOYEE)
return;



const div =
document.createElement("div");


div.className="request-item";


div.innerHTML = `

<div
class="request-card"
onclick="readNotification('${doc.id}')"
style="cursor:pointer;"
>

<h3>
🔔 Notifica
</h3>

<p>
${n.message}
</p>

</div>

`;

list.appendChild(div);


});


}

);


};

// ======================
// 🔔 CARICA NOTIFICHE
// ======================

window.loadNotifications = function(){


const list =
document.getElementById("requestsList");

if(!list){
  console.error("requestsList non trovato");
  return;
}

list.innerHTML = "Caricamento...";



firestore.onSnapshot(

firestore.collection(db,"notifications"),

(snap)=>{


list.innerHTML = "";


snap.forEach(doc=>{


const n = doc.data();


if(n.employee !== CURRENT_EMPLOYEE)
return;


const div =
document.createElement("div");


div.className="request-item";


div.innerHTML = `

<div
class="request-card"
onclick="readNotification('${doc.id}')"
style="cursor:pointer;"
>

<h3>
🔔 Notifica
</h3>

<p>
${n.message}
</p>

</div>

`;


list.appendChild(div);


});


}

);


};
// ======================
// ❌ CHIUDI POPUP RICHIESTE
// ======================

window.closeRequestsPopup = function(){

  const popup =
    document.getElementById("changeRequestsPopup");

  if(popup){

    popup.style.display = "none";

  }

};

// ======================
// 👑 GESTIONE ADMIN RICHIESTA
// ======================

window.handleAdminRequest = async function(
  requestId,
  action
){

try{


const requestDoc =
await firestore.getDoc(
  firestore.doc(
    db,
    "changeRequests",
    requestId
  )
);


const req = requestDoc.data();



if(action === "APPROVE"){


// ======================
// PRENDO EVENTI ORIGINALI
// ======================


const fromEvent =
savedEvents.find(e =>
  e.employee === req.fromEmployee &&
  e.date === req.fromDate &&
  e.shift === req.shift
);



const toEvent =
savedEvents.find(e =>
  e.employee === req.toEmployee &&
  e.date === req.toDate &&
  e.shift === req.shift
);



// controllo sicurezza

if(!fromEvent || !toEvent){

 alert(
 "❌ Impossibile trovare le reperibilità da scambiare"
 );

 return;

}



// ======================
// 🔥 CONTROLLO ATTIVITÀ GIORNI SCAMBIO
// ======================


const checkTargetDay = (employee, date, newShift) => {


  const events = savedEvents.filter(e =>
    e.employee === employee &&
    e.date === date
  );


  // nessuna attività presente
  if(events.length === 0){

    return true;

  }



  const existingShifts =
    events.map(e => e.shift);



  const hasREC =
    existingShifts.includes("REC");



  // ======================
  // ✅ ECCEZIONE REC + REP
  // ======================

  if(
    hasREC &&
    newShift === "REP" &&
    events.length === 1
  ){

    return true;

  }



  return false;

};




// MANUNTA riceve il giorno di SANTILLO
const checkToEmployee = checkTargetDay(
  req.toEmployee,
  req.fromDate,
  req.shift
);



// SANTILLO riceve il giorno di MANUNTA
const checkFromEmployee = checkTargetDay(
  req.fromEmployee,
  req.toDate,
  req.shift
);



if(!checkToEmployee || !checkFromEmployee){



 await firestore.updateDoc(

  firestore.doc(
   db,
   "changeRequests",
   requestId
  ),

  {
   status:"ADMIN_REJECTED",
   reason:"Attività già presente nel giorno dello scambio"
  }

 );


 alert(
 "❌ Cambio rifiutato.\n\nUno dei dipendenti ha già un'attività nel giorno dello scambio"
 );


 return;


}



// ======================
// ELIMINO VECCHI TURNI
// ======================


await firestore.deleteDoc(
 firestore.doc(
  db,
  "events",
  fromEvent.id
 )
);


await firestore.deleteDoc(
 firestore.doc(
  db,
  "events",
  toEvent.id
 )
);



// ======================
// CREO NUOVI TURNI
// ======================


await firestore.addDoc(
 firestore.collection(db,"events"),
 {

 employee:req.toEmployee,
 date:req.fromDate,
 shift:req.shift,
 createdAt:new Date()

 }

);



await firestore.addDoc(
 firestore.collection(db,"events"),
 {

 employee:req.fromEmployee,
 date:req.toDate,
 shift:req.shift,
 createdAt:new Date()

 }

);



// ======================
// AGGIORNO RICHIESTA
// ======================


await firestore.updateDoc(

 firestore.doc(
  db,
  "changeRequests",
  requestId
 ),

 {
  status:"APPROVED"
 }

);


// 🔔 NOTIFICA A MANUNTA

const message =
`✅ L'Admin ha approvato il cambio reperibilità ${req.fromDate} ➡️ ${req.toDate}`;


await firestore.addDoc(
  firestore.collection(db, "notifications"),
  {
    employee: req.fromEmployee,
    email: employeesData[req.fromEmployee]?.email,
    message: message,
    read: false,
    createdAt: new Date()
  }
);

console.log(
  "📨 Notifica creata per:",
  req.fromEmployee
);


// 🔔 NOTIFICA A DIPENDENTE C

await firestore.addDoc(

 firestore.collection(db,"notifications"),

 {
 employee:req.toEmployee,

 email:
employeesData[req.toEmployee]?.email,
message:
`✅ L'Admin ha approvato il cambio reperibilità ${req.fromDate} ➡️ ${req.toDate}`,
 read:false,

 createdAt:new Date()
}

);


alert("✅ Cambio reperibilità approvato");


}else{


await firestore.updateDoc(

 firestore.doc(
  db,
  "changeRequests",
  requestId
 ),

 {
  status:"ADMIN_REJECTED"
 }

);


// 🔔 NOTIFICA RIFIUTO A MANUNTA

await firestore.addDoc(

 firestore.collection(db,"notifications"),

 {
  employee:req.fromEmployee,

    email:
employeesData[req.fromEmployee]?.email,
 
    message:
  `❌ L'Admin ha rifiutato il cambio reperibilità ${req.fromDate} ➡️ ${req.toDate}`,

  read:false,

  createdAt:new Date()

 }

);


// 🔔 NOTIFICA RIFIUTO A DIPENDENTE C

await firestore.addDoc(

 firestore.collection(db,"notifications"),

{
  employee:req.toEmployee,

  email:
  employeesData[req.toEmployee]?.email,

  message:
  `❌ L'Admin ha rifiutato il cambio reperibilità ${req.fromDate} ➡️ ${req.toDate}`,

  read:false,

  createdAt:new Date()

}

);


alert("❌ Cambio rifiutato");


}


closeRequestsPopup();

}catch(err){

console.error(
"Errore admin:",
err
);

}

};
// ======================
// 📋 LISTA RICHIESTE
// ======================

window.loadRequestsList = function(){

  const list =
    document.getElementById("requestsList");


  list.innerHTML = "Caricamento...";


  firestore.onSnapshot(

    firestore.collection(db,"changeRequests"),

    (snap)=>{


      list.innerHTML = "";


      snap.forEach(doc=>{


        const req = doc.data();



  // ======================
// 👤 LIVELLO DIPENDENTE
// ======================

if(
  req.toEmployee === CURRENT_EMPLOYEE &&
  req.status === "PENDING_USER"
){


const div =
document.createElement("div");


div.className = "request-item";


div.innerHTML = `

<div class="request-card">

<h2 class="request-title-popup">
Gestione richiesta
</h2>

<div class="request-employee-popup">
${employeesData[req.fromEmployee]?.name}
</div>

<div class="request-shift-popup">
(${req.shift})
</div>

<div class="request-date-popup">
${req.fromDate} → ${req.toDate}
</div>

<button
class="request-accept-btn"
onclick="
event.stopPropagation();
handleChangeRequest('${doc.id}','ACCEPT')
">
✅ Accetta
</button>

<button
class="request-reject-btn"
onclick="
event.stopPropagation();
handleChangeRequest('${doc.id}','REJECT')
">
❌ Rifiuta
</button>

</div>

`;

list.appendChild(div);

}




        // ======================
        // 👑 LIVELLO ADMIN
        // ======================

       if(
    employeesData[CURRENT_EMPLOYEE]?.role === "ADMIN" &&
    req.status === "PENDING_ADMIN"
)
        
        {
          
          const div =
          document.createElement("div");


          div.className = "request-item";


          div.innerHTML = `

<div class="request-card">

<h2 class="request-title-popup">
Gestione richiesta
</h2>

<div class="request-employee-popup">
Richiedente: ${employeesData[req.fromEmployee]?.name}
</div>

<div class="request-employee-popup">
Ricevente: ${employeesData[req.toEmployee]?.name}
</div>

<div class="request-shift-popup">
(${req.shift})
</div>

<div class="request-date-popup">
${req.fromDate} → ${req.toDate}
</div>

<button
class="request-accept-btn"
onclick="
event.stopPropagation();
handleAdminRequest('${doc.id}','APPROVE')
">
✅ Approva
</button>

<button
class="request-reject-btn"
onclick="
event.stopPropagation();
handleAdminRequest('${doc.id}','REJECT')
">
❌ Rifiuta
</button>

</div>

`;


          list.appendChild(div);


        }


      });


    }

  );

};

// ======================
// ✅❌ GESTIONE RICHIESTA
// ======================

window.handleChangeRequest = async function(
  requestId,
  action
){

try{


// recupero richiesta

const requestDoc =
await firestore.getDoc(

  firestore.doc(
    db,
    "changeRequests",
    requestId
  )

);


const req = requestDoc.data();



let newStatus;
let notificationText;



// ======================
// ACCETTA
// ======================

if(action === "ACCEPT"){


  newStatus = "PENDING_ADMIN";


  notificationText =
  `✅ La richiesta di cambio è stata accettata da ${employeesData[req.toEmployee]?.name}ed inoltrata all'Admin`;



}


// ======================
// RIFIUTA
// ======================

else{


  newStatus = "USER_REJECTED";


 notificationText =
  `❌ La richiesta di cambio è stata rifiutata da ${employeesData[req.toEmployee]?.name}`;

}



// aggiorno richiesta

await firestore.updateDoc(

  firestore.doc(
    db,
    "changeRequests",
    requestId
  ),

  {

    status:newStatus,

    notification:notificationText

  }

);



// creo notifica al richiedente

await firestore.addDoc(

  firestore.collection(db,"notifications"),

  {

    employee:req.fromEmployee,

    message:notificationText,

    read:false,

    createdAt:new Date()

  }

);



closeRequestActionPopup();



alert(notificationText);



}catch(err){

console.error(
"Errore gestione richiesta:",
err
);


}

};


// ======================
// PDF FESTIVI
// ======================

window.exportFestiviPdf = async function(){

const { jsPDF } = window.jspdf;
const pdf = new jsPDF();

pdf.setFontSize(16);
pdf.text("Turnazione Festivi", 14, 15);

const snapshot = await firestore.getDocs(
  firestore.collection(db, "events")
);

let rows = [];

snapshot.forEach(doc => {

  const ev = doc.data();

  if (ev.shift !== "FREP" && ev.shift !== "CFI/REP") return;
  if (!isHoliday(ev.date)) return;

  rows.push([
    formatDateIT(ev.date),
    employeesData[ev.employee]?.name || "",
    ev.shift
  ]);

});

pdf.autoTable({
  head: [["Data", "Dipendente", "Turno"]],
  body: rows,
  startY: 25
});

// 👉 apre direttamente il tuo sistema PDF (quello già funzionante)
await openPdfPreview(pdf, "Turnazione_Festivi.pdf");

};



// ======================
// PDF CFI
// ======================

window.exportCfiPdf = async function(){

const { jsPDF } = window.jspdf;
const pdf = new jsPDF();
window.lastPdf = pdf;
   
pdf.setFontSize(16);
pdf.text("Totale CFI / CFI-REP", 14, 15);

const stats = {};

Object.keys(employeesData).forEach(id => {
  stats[id] = {
    name: employeesData[id]?.name,
    cfiF: 0,
    cfiA: 0
  };
});

const snapshot = await firestore.getDocs(
  firestore.collection(db, "events")
);

snapshot.forEach(doc => {

  const ev = doc.data();

  if (ev.shift !== "CFI" && ev.shift !== "CFI/REP") return;

 const d = new Date(ev.date);
const today = new Date();
const year = today.getFullYear();

// SOLO ANNO CORRENTE
if (d.getFullYear() !== year) return;

// peso come prima
const weight =
  (d.getDay() === 0 ||
   d.getDay() === 6 ||
   isHoliday(ev.date))
  ? 2
  : 1;

if (stats[ev.employee]) {

  // TOT ANNUALE
  stats[ev.employee].cfiA += weight;

const today = new Date();
today.setHours(23, 59, 59, 999);

// dentro snapshot.forEach
if (d <= today) {
  stats[ev.employee].cfiF += weight;
}

}

});

const rows = Object.values(stats).map(emp => [
  emp.name,
  emp.cfiF,
  emp.cfiA
]);

pdf.autoTable({
  head: [["Nominativi", "TOT. CFI/F", "TOT. CFI/A"]],
  body: rows,
  startY: 25
});

// 👉 usa lo stesso sistema PDF con anteprima
await openPdfPreview(pdf, "Totale_CFI_CFI-REP.pdf");

};

function setupAdminUI() {

  const isAdmin = window.IS_ADMIN === true;

  const toggle = (id, visible) => {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? "inline-flex" : "none";
  };

  // ======================
  // BOTTONI ADMIN ONLY
  // ======================

  toggle("adminOnlyBtn", isAdmin);
  toggle("adminBtn", isAdmin); // ⚙️ se vuoi nascondere anche questo

  // ======================
  // BOTTONI PRINCIPALI
  // ======================

  toggle("pdfBtn", isAdmin);
  toggle("statsBtn", isAdmin);
  toggle("addBtn", isAdmin);
  toggle("logoutBtn", isAdmin);
}

// ======================
// 🔑 FIRMA CALENDARIO PDF
// ======================

function getCalendarSignature() {

  const baseYear = currentDate.getFullYear();
  const baseMonth = currentDate.getMonth();
  const months = window.currentPdfMonths || 1;

  const start = new Date(baseYear, baseMonth, 1);

  const end = new Date(
    baseYear,
    baseMonth + months,
    0
  );


  const events = savedEvents
    .filter(ev => {

      const d = new Date(ev.date);

      return d >= start && d <= end;

    })
    .sort((a,b)=>{

      if(a.date !== b.date)
        return a.date.localeCompare(b.date);

      if(a.employee !== b.employee)
        return a.employee.localeCompare(b.employee);

      return a.shift.localeCompare(b.shift);

    });


  return JSON.stringify(

    events.map(e=>({

      date:e.date,
      employee:e.employee,
      shift:e.shift

    }))

  );

}
// ======================
// 📤 CONDIVIDI PDF
// ======================

window.sharePdf = async function () {

  console.log("sharePdf chiamata");


  if (!window.currentPdfBlob) {

    alert("Nessun PDF disponibile");

    return;

  }


  // 🔑 firma del calendario del PDF generato
  const signature = getCalendarSignature();


  console.log(
    "FIRMA CALENDARIO:",
    signature
  );


  // ======================
  // 📄 VERSIONE FIREBASE
  // ======================

  const pdfInfo =
    await getPdfVersion(window.currentPdfKey);


  let version =
    pdfInfo.version;


  // Se il contenuto è cambiato
  if (
    pdfInfo.signature &&
    pdfInfo.signature !== signature
  ) {

    version++;


  }


  // salva sempre la situazione attuale

  await savePdfVersion(
    version,
    signature
  );


  window.pdfVersion =
    `1/${version}`;


  console.log(
    "VERSIONE PDF:",
    window.pdfVersion
  );


  // ======================
  // 📅 DATA INVIO
  // ======================

  const now = new Date();


  const dataInvio =
    now.toLocaleDateString("it-IT")
    +
    " "
    +
    now.toLocaleTimeString("it-IT");


  window.pdfSendDate =
    dataInvio;



  // ======================
  // 📄 CREA FILE
  // ======================

  const file =
    new File(

      [window.currentPdfBlob],

      "Reperibilità PLF.pdf",

      {
        type:"application/pdf"
      }

    );



  // ======================
  // 📤 CONDIVIDI
  // ======================

  if (
    navigator.share &&
    navigator.canShare({
      files:[file]
    })

  ) {


    await navigator.share({

      title:
      "Reperibilità PLF",

      files:[file]

    });


  } else {


    alert(
      "Condivisione non supportata"
    );


  }

   };
   
// ======================
// ⚙️ PAGINA AMMINISTRAZIONE
// ======================

window.openAdminPage = function () {

  document.getElementById("app").style.display = "none";
  document.getElementById("adminPage").style.display = "block";

};

window.closeAdminPage = function () {

  document.getElementById("adminPage").style.display = "none";
  document.getElementById("app").style.display = "block";

};

// ======================
// CARICA NOMINATIVI FIRESTORE
// ======================

async function loadEmployeesFromFirestore() {
  try {

    window.employeesData = window.employeesData || {};

    Object.keys(employeesData).forEach(key => {
      delete employeesData[key];
    });

const snapshot = await firestore.getDocs(
  firestore.collection(db, "employees")
);

    snapshot.forEach(doc => {
      employeesData[doc.id] = doc.data();
    });

    console.log("👥 Nominativi caricati:", employeesData);

  } catch (err) {
    console.error("Errore caricamento employees:", err);
  }
}

// ======================
// GESTIONE NOMINATIVI
// ======================

window.openEmployeesPage = async function () {

  document.getElementById("adminPage").style.display = "none";
  document.getElementById("employeesPage").style.display = "block";

  const container = document.getElementById("employeesList");
  container.innerHTML = "<p>Caricamento...</p>";

  await loadEmployeesFromFirestore();
  loadEmployeesList();
};

window.closeEmployeesPage = function () {

  document.getElementById("employeesPage").style.display = "none";
  document.getElementById("adminPage").style.display = "block";

};

// ======================
// LISTA NOMINATIVI
// ======================

window.loadEmployeesList = function () {

  const container = document.getElementById("employeesList");
  container.innerHTML = "";

  Object.keys(employeesData).forEach(id => {

    const emp = employeesData[id];

    container.innerHTML += `
      <div class="employee-row">

        <div>
          <strong>${emp.name}</strong><br>
          <small>${emp.email || ""}</small><br>
          <small>${emp.role}</small>
        </div>

        <div class="employee-actions">

          <button onclick="editEmployee('${id}')">✏️</button>
          <button onclick="deleteEmployee('${id}')">🗑️</button>

        </div>

      </div>
    `;
  });

};

// ======================
// EDIT / DELETE
// ======================

window.editEmployee = function (id) {

  editingEmployeeId = id;

  const emp = employeesData[id];

  // Codice dipendente
  document.getElementById("empCode").value = id;
  document.getElementById("empCode").disabled = true;

  // Altri campi
  document.getElementById("empName").value = emp.name || "";
  document.getElementById("empEmail").value =
  emp.email || "";
  document.getElementById("empColor").value = emp.color || "#ffffff";
  document.getElementById("empRole").value = emp.role || "USER";

  document.querySelector("#employeePopup h2").textContent =
    "✏️ Modifica Nominativo";

  document.getElementById("employeePopup").style.display = "flex";

};

window.deleteEmployee = async function (id) {

  const emp = employeesData[id];

  const ok = confirm(
    `Vuoi eliminare "${emp.name}"?`
  );

  if (!ok) return;

  try {

    // 🗑️ elimina documento users
    if (emp.uid) {
      await firestore.deleteDoc(
        firestore.doc(db, "users", emp.uid)
      );
    }

    // 🗑️ elimina documento employees
    await firestore.deleteDoc(
      firestore.doc(db, "employees", id)
    );

    await loadEmployeesFromFirestore();
    loadEmployeesList();
    await populateEmployeeSelects();
    await renderCalendar();

  } catch (err) {

    console.error(err);
    alert("Errore eliminazione nominativo");

  }

};

// ======================
// ➕ NUOVO NOMINATIVO (FIX IMPORTANTE)
// ======================

window.openEmployeeEditor = function () {

  editingEmployeeId = null;

  // reset campi
  document.getElementById("empCode").value = "";
  document.getElementById("empCode").disabled = false;

  document.getElementById("empName").value = "";
  document.getElementById("empEmail").value = "";
  document.getElementById("empColor").value = "#ffffff";
  document.getElementById("empRole").value = "USER";

  // titolo popup
  document.querySelector("#employeePopup h2").textContent =
    "👤 Nuovo Nominativo";

  // apri popup
  document.getElementById("employeePopup").style.display = "flex";
};

window.closeEmployeeEditor = function () {

  document.getElementById("employeePopup").style.display = "none";

};

window.saveEmployee = async function () {

  const code = document.getElementById("empCode").value.trim().toUpperCase();

const email = document.getElementById("empEmail")?.value.trim() || "";
const password = document.getElementById("empPassword")?.value || "";
const name = document.getElementById("empName").value.trim();
const color = document.getElementById("empColor").value;
const role = document.getElementById("empRole").value;
 
  if (!name) {
    alert("Inserisci un nome");
    return;
  }

 if (!code) {
  alert("Inserisci il codice dipendente");
  return;
}
 
  try {

    // ======================
    // ✏️ MODIFICA DIPENDENTE
    // ======================
    if (editingEmployeeId) {

      await firestore.updateDoc(
        firestore.doc(db, "employees", editingEmployeeId),
       {
  code,
  name,
  email,
  color,
  role
}
      );

    }

    // ======================
    // ➕ NUOVO DIPENDENTE (FIREBASE AUTH)
    // ======================
    else {

      if (!email || !password) {
        alert("Email e password obbligatorie");
        return;
      }

     // 🔐 crea utente auth
const userCredential =
  await createUserWithEmailAndPassword(auth, email, password);

const uid = userCredential.user.uid;


// ======================
// 📦 CREA PROFILO EMPLOYEE
// ======================

await firestore.setDoc(
  firestore.doc(db, "employees", code),
  {
    code,
    uid,
    name,
    email,
    color,
    role,
    createdAt: new Date()
  }
);


// ======================
// 👤 CREA UTENTE LOGIN
// ======================

console.log("PRIMA USERS", uid, email, code);
     
console.log("CREO USERS:", uid);

await firestore.setDoc(
  firestore.doc(db, "users", uid),
  {
    uid: uid,
    email: email,
    employee: code,
    role: role,
    active: true,
    createdAt: new Date()
  }
);

console.log("USERS CREATO");
    }

    // ======================
    // UI RESET
    // ======================

    document.getElementById("employeePopup").style.display = "none";

    editingEmployeeId = null;

    document.querySelector("#employeePopup h2").textContent =
      "👤 Nuovo Nominativo";

    await loadEmployeesFromFirestore();
    loadEmployeesList();
    await populateEmployeeSelects();
    await renderCalendar();

  } catch (err) {

    console.error("Errore salvataggio nominativo:", err);

    if (err.code === "auth/email-already-in-use") {
      alert("Email già registrata");
    } else {
      alert("Errore salvataggio dipendente");
    }
  }
};
