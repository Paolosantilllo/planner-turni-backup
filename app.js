
/* ======================
   IMPORT MODULI
====================== */

import { initAuth, logout, CURRENT_EMPLOYEE } from "./auth.js";
import { db, firestore } from "./firebase.js";
import { EMPLOYEES, SHIFT_COLORS } from "./employees.js";


window.logout = logout;

initAuth(() => {

  loadEvents();

  loadChangeRequests();

  loadNotificationBadge();

});


/* ======================
   STATO APP
====================== */

let currentDate = new Date();
let savedEvents = [];

const calendar = document.getElementById("calendar");
const monthTitle = document.getElementById("monthTitle");
const employeeFilter = document.getElementById("employeeFilter");

employeeFilter.addEventListener("change", () => {
  renderCalendar();
});

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
      new Date(e.date).getMonth() === new Date(date).getMonth()
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
   CARICA EVENTI FIREBASE
====================== */

function loadEvents() {

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

      console.log("EVENTI CARICATI:", savedEvents.length);

            renderCalendar(); // 👈 SOLO QUI

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

let events = savedEvents.filter(e => {
  if (e.date !== date) return false;

  if (selectedEmployee === "ALL") {
    return true;
  }

  return e.employee === selectedEmployee;
});

const box = document.createElement("div");
box.classList.add("day");
box.style.cursor = "pointer";
   
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


box.onclick = () => openPopupWithDate(date, events);


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
// EVENTI DEL GIORNO
// ======================

events.forEach(ev => {


  if (!ev || !ev.employee || !ev.shift) return;


  const el = document.createElement("div");

  el.classList.add("event");


  const emp = EMPLOYEES[ev.employee];


  if (selectedEmployee === "ALL") {


    // Colore dipendente

    if (emp?.color) {

      el.classList.add(emp.color);

    }


  } else {


    // Colore turno

    const shiftKey = (ev.shift || "").trim();

    const color = SHIFT_COLORS[shiftKey];


    if (color) {

      el.style.backgroundColor = color;

    }


    el.style.color =
      (shiftKey === "CFI" || shiftKey === "CFI/REP")
        ? "#fff"
        : "#000";

  }



  // ======================
// 🔴 REGOLA FESTIVI
// ======================

if (dayInfo.isSunday || dayInfo.isHoliday) {

  el.classList.add("frep-text");

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

window.openPopupWithDate = function(date, events = []) {

  document.getElementById("startDate").value = date;
  document.getElementById("endDate").value = date;

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

  if (!employee || !startDate || !shift) {
    alert("Compila tutti i campi");
    return;
  }

  const start = new Date(startDate);
  const end = new Date(endDate || startDate);

  try {

    const writes = [];

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
    new Date(e.date).getMonth() === d.getMonth()
  ).length;

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
    new Date(e.date).getMonth() === d.getMonth()
  ).length;

  if (monthly >= 2) {
    alert("Max 2 FREP al mese");
    return;
  }
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
//  📤 PDF EXPORT
// ======================

function generatePDF(months = 1) {

  const missingMessages = [];

  const baseYear = currentDate.getFullYear();
  const baseMonth = currentDate.getMonth();

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
      missingMessages.push(date);
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
  const pdf = new jsPDF("landscape", "mm", "a4");

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
    // 📌 TITOLO
    // ======================
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");

    pdf.text(
  `Reperibilità specialisti PLF del mese di ${monthNames[month].toUpperCase()} ${year}`,
  148,
  startY,
  { align: "center" }
);

    startY += 5;

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

    const dipendenti = Object.keys(EMPLOYEES);

    const body = dipendenti.map(nome => {
      const row = [EMPLOYEES[nome].name];

      for (let d = 1; d <= daysInMonthLoop; d++) {

        const dateStr =
          `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

        const ev = savedEvents.find(e =>
          e.date === dateStr && e.employee === nome
        );

        row.push(ev ? ev.shift : "");
      }

      return row;
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const nameColWidth = 28;
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
       
      tableWidth: "wrap",
      margin: { left: 3, right: 3 },
      styles: {
        fontSize: 4.5,
        cellPadding: 0.4,
        halign: "center",
        valign: "middle"
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
  // RIGHE DIPENDENTI
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
  // 🟣 GIORNI SCOPERTI (SOLO SE CELLA VUOTA)
  // ======================
  if (uncoveredDays.has(dayNumber)) {

    if (!value || value === "") {
      data.cell.styles.fillColor = [180,120,255];
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

  // 🩷 REP
  if (value === "REP" || value === "FREP") {
    data.cell.styles.fillColor = [255,182,193];
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
  // 📤 OUTPUT (DEVE STARE QUI)
  // ======================
  const blobUrl = pdf.output("bloburl");
  window.open(blobUrl, "_blank");
}

 // ======================
// 📤 PDF POPUP CONTROL
// ======================
window.openPdfPopup = function () {
  document.getElementById("pdfPopup").style.display = "flex";
};

window.closePdfPopup = function () {
  document.getElementById("pdfPopup").style.display = "none";
};

window.confirmPdfExport = function () {

  const months = parseInt(
    document.getElementById("monthsRange").value
  );

  closePdfPopup();

  generatePDF(months);
};


// ======================
// BOTTONE PDF
// ======================

window.addEventListener("DOMContentLoaded", () => {

  const btn = document.getElementById("pdfBtn");

  if (!btn) {
    console.error("pdfBtn non trovato");
    return;
  }

  btn.addEventListener("click", () => {
    document.getElementById("pdfPopup").style.display = "flex";
  });

});
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

          document.getElementById(
            "selectedFromText"
          ).innerText = iso;

          window.selectedFromDate = iso;

        } else {

          document.getElementById(
            "selectedToText"
          ).innerText = iso;

          window.selectedToDate = iso;
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

  Object.keys(EMPLOYEES).forEach(emp => {

    if (emp === CURRENT_EMPLOYEE) return;

    const option = document.createElement("option");

    option.value = emp;
    option.textContent = EMPLOYEES[emp].name;

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


  if(!window.selectedFromDate || !window.selectedToDate){

    alert("Seleziona giorno da dare e giorno da ricevere");
    return;

  }


  try {


    await firestore.addDoc(
      firestore.collection(db,"changeRequests"),
      {

        fromEmployee: CURRENT_EMPLOYEE,

        toEmployee: toEmployee,

        fromDate: window.selectedFromDate,

        toDate: window.selectedToDate,

        shift: shift,

        status:"PENDING_USER",

        createdAt: new Date()

      }
    );


    alert("✅ Richiesta inviata");


    closeChangePopup();

  } catch(err){

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

await firestore.addDoc(

 firestore.collection(db,"notifications"),

 {
  employee:req.fromEmployee,

  message:
  `✅ L'Admin ha approvato il cambio reperibilità ${req.fromDate} ➡️ ${req.toDate}`,

  read:false,

  createdAt:new Date()

 }

);


// 🔔 NOTIFICA A DIPENDENTE C

await firestore.addDoc(

 firestore.collection(db,"notifications"),

 {
  employee:req.toEmployee,

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
${EMPLOYEES[req.fromEmployee].name}
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
          EMPLOYEES[CURRENT_EMPLOYEE].role === "ADMIN" &&
          req.status === "PENDING_ADMIN"
        ){


          const div =
          document.createElement("div");


          div.className = "request-item";


          div.innerHTML = `

<p>
👑 Approvazione Admin
</p>


<p>
Richiedente:
${EMPLOYEES[req.fromEmployee].name}
</p>


<p>
Sostituto:
${EMPLOYEES[req.toEmployee].name}
</p>


<p>
Giorno:
${req.fromDate}
➡️
${req.toDate}
</p>


<p>
Turno:
${req.shift}
</p>


<div class="popup-actions">


<button
class="btn-accept"
onclick="
event.stopPropagation();
handleAdminRequest('${doc.id}','APPROVE')
">
✅ Approva
</button>


<button
class="btn-reject"
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
  `✅ La richiesta di cambio è stata accettata da ${EMPLOYEES[req.toEmployee].name} ed inoltrata all'Admin`;



}


// ======================
// RIFIUTA
// ======================

else{


  newStatus = "USER_REJECTED";


  notificationText =
  `❌ La richiesta di cambio è stata rifiutata da ${EMPLOYEES[req.toEmployee].name}`;


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
