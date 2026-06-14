/* ======================
   IMPORT MODULI
====================== */

import { initAuth } from "./auth.js";
import { db, firestore } from "./firebase.js";
import { EMPLOYEES, SHIFT_COLORS } from "./employees.js";

initAuth(() => {
  loadEvents();
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
  // BLOCCO DUPLICATO GIORNO (REP / FREP)
  // ======================

  const repExists = sameDayEvents.some(e => e.shift === "REP");
  const frepExists = sameDayEvents.some(e => e.shift === "FREP");

  if (shift === "REP" && repExists) {
    return {
      ok: false,
      message: "❌ Esiste già un REP in questo giorno"
    };
  }

  if (shift === "FREP" && frepExists) {
    return {
      ok: false,
      message: "❌ Esiste già un FREP in questo giorno"
    };
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
  if (dayInfo.isSunday || isHoliday(date)) {
    num.classList.add("day-red");
  }

  num.innerText = day;

  box.appendChild(num);
   
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

// ✅ REGOLA FESTIVI
const dayInfo = getDayInfo(date);

if (
  (dayInfo.isSunday || dayInfo.isHoliday) &&
  (
    ev.shift === "FREP" ||
    ev.shift === "CFI/REP" ||
    ev.shift === "MAL" ||
    ev.shift === "LIC"
  )
) {
  el.classList.add("frep-text");
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

  const repExists = sameDay.some(e => e.shift === "REP");
  const frepExists = sameDay.some(e => e.shift === "FREP");

  // ======================
// 🔥 CONTROLLO TURNI DIPENDENTE (NUOVA REGOLA)
// ======================

const employeeEvents = sameDay.filter(
  e => e.employee === employee
);

// se il dipendente ha già eventi quel giorno
if (employeeEvents.length > 0) {

  const existingShifts = employeeEvents.map(e => e.shift);

  const hasRep = existingShifts.includes("REP");
  const hasRec = existingShifts.includes("REC");

  const isAllowedCombo =
    (shift === "REC" && hasRep) ||
    (shift === "REP" && hasRec);

  // ❌ blocco tutto tranne REP + REC
  if (!isAllowedCombo) {

    alert(`❌ ${employee} ha già un REP in ${dateStr}`);

    return;
  }
}

  // ❌ blocco REP/FREP stesso giorno
  if (shift === "REP" && frepExists) {
    alert("❌ C’è già FREP in questo giorno");
    return;
  }

  if (shift === "FREP" && repExists) {
    alert("❌ C’è già REP in questo giorno");
    return;
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

function generatePDF() {

  const missingMessages = [];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth =
    new Date(year, month + 1, 0).getDate();

  // ======================
  // 🔍 CONTROLLO COPERTURA
  // ======================
  for (let d = 1; d <= daysInMonth; d++) {

    const date =
      `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    const info = getDayInfo(date);

const hasCoverage = savedEvents.some(ev => {

  if (ev.date !== date) return false;

  // Domeniche e festivi
  if (info.isSunday || info.isHoliday) {

    return (
      ev.shift === "FREP" ||
      ev.shift === "CFI/REP"
    );
  }

  // Lunedì-Sabato
  return (
    ev.shift === "REP" ||
    ev.shift === "CFI/REP"
  );

});
    if (!hasCoverage) {
      missingMessages.push(
        `${String(d).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${String(year).slice(-2)}`
      );
    }
  }

  // ======================
  // ⚠️ AVVISO MANCANZE
  // ======================
  if (missingMessages.length > 0) {

    const proceed = confirm(
      "⚠️ Mancano le seguenti reperibilità:\n\n" +
      missingMessages.join("\n") +
      "\n\nVuoi comunque generare il PDF?"
    );

    if (!proceed) return;
  }

  // ======================
  // 📄 GENERAZIONE PDF (NUOVO SISTEMA COLLEGATO ALL'APP)
  // ======================
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("landscape", "mm", "a4");

  const monthNames = [
    "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
    "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"
  ];

  // ======================
  // 🧾 INTITOLAZIONE PDF
  // ======================
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");

  pdf.text(
    `Reperibilità Specialisti PLF - ${monthNames[month]} ${year}`,
    148,
    15,
    { align: "center" }
  );

  // ======================
// 📅 DATA + VERSIONE PDF
// ======================

const now = new Date();

const sendDate = now.toLocaleDateString("it-IT");

if (!window.pdfVersion) {
  window.pdfVersion = 1;
} else {
  window.pdfVersion++;
}

pdf.setFontSize(9);
pdf.setFont("helvetica", "normal");

pdf.text(
  `Data invio: ${sendDate}`,
  285,
  10,
  { align: "right" }
);

pdf.text(
  `Versione: 1/${window.pdfVersion}`,
  285,
  15,
  { align: "right" }
);

  // ======================
  // 📊 STAFF (COLLEGATO ALL'APP)
  // ======================
  // ⚠️ QUI DEVE ESISTERE NEL TUO FILE
  // esempio:
  // let staff = [{grado:"LGT.", nome:"..."}, ...]

  // ======================
  // 📊 GENERAZIONE TABELLA DINAMICA
  // ======================
  

const map = ["D", "L", "Ma", "Me", "G", "V", "S"];

// ======================
// 📊 HEADER (riga 1: numeri + Nominativi)
// ======================
const head = [
  [
    "Nominativi",
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ]
];

// ======================
// 📊 HEADER (riga 2: giorni settimana)
// ======================
const weekdayRow = [
  "",
  ...Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = new Date(year, month, day);
    return map[date.getDay()];
  })
];

// ======================
// 👥 DIPENDENTI
// ======================
const dipendenti = Object.keys(EMPLOYEES);

const body = dipendenti.map(nome => {

  const row = [
    EMPLOYEES[nome].name
  ];

  for (let d = 1; d <= daysInMonth; d++) {

    const date =
      `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    const ev = savedEvents.find(e =>
      e.date === date &&
      e.employee === nome
    );

    row.push(ev ? ev.shift : "");
  }

  return row;
});

// ======================
// ⚠️ GIORNI SCOPERTI
// ======================
const uncoveredDays = [];

for (let d = 1; d <= daysInMonth; d++) {

  const date =
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const info = getDayInfo(date);

  const covered = savedEvents.some(ev => {

    if (ev.date !== date) return false;

    if (info.isSunday || info.isHoliday) {
      return (
        ev.shift === "FREP" ||
        ev.shift === "CFI/REP"
      );
    }

    return (
      ev.shift === "REP" ||
      ev.shift === "CFI/REP"
    );
  });

  if (!covered) {
    uncoveredDays.push(d);
  }
}

// ======================
// 📐 LAYOUT TABELLA
// ======================
const pageWidth = pdf.internal.pageSize.getWidth();

const nameColWidth = 28;
const usableWidth = pageWidth - nameColWidth - 10;

// scaling SOLO per sicurezza stampa
let scaleFactor = 1;
if (daysInMonth === 31) scaleFactor = 0.90;
if (daysInMonth === 30) scaleFactor = 0.94;

const dayColWidth = (usableWidth * scaleFactor) / daysInMonth;

// column styles pulito
const columnStyles = {
  0: { cellWidth: nameColWidth }
};

for (let i = 1; i <= daysInMonth; i++) {
  columnStyles[i] = { cellWidth: dayColWidth };
}

pdf.autoTable({
  head,
  body: [
    weekdayRow,
    ...body
  ],

  startY: 28,
  theme: "grid",

  tableWidth: "wrap",
  margin: { left: 5, right: 5 },

  styles: {
    fontSize: 5.5,
    cellPadding: 0.4,
    halign: "center",
    valign: "middle",
    overflow: "linebreak"
  },

  headStyles: {
    fontStyle: "bold",
    cellPadding: 0.2,
    minCellHeight: 4
  },

  columnStyles,

  didParseCell: function (data) {

    const colIndex = data.column.index;
    const value = data.cell.raw;

    const dayNumber = colIndex;
    const date = new Date(year, month, dayNumber);
    const weekday = date.getDay();
    const isHoliday = holidays.includes(`${dayNumber}-${month + 1}`);

    // =========================
    // 🟢 HEADER
    // =========================
    if (data.section === "head") {

      if (colIndex === 0) {
        data.cell.styles.fillColor = [255, 255, 255];
        data.cell.styles.textColor = [0, 0, 0];
        data.cell.styles.fontStyle = "bold";
        return;
      }

      if (weekday === 0 || isHoliday) {
        data.cell.styles.fillColor = [255, 59, 48];
        data.cell.styles.textColor = [255, 255, 255];
        return;
      }

      if (weekday === 6) {
        data.cell.styles.fillColor = [255, 149, 0];
        data.cell.styles.textColor = [0, 0, 0];
        return;
      }

      data.cell.styles.fillColor = [255, 255, 255];
      data.cell.styles.textColor = [0, 0, 0];
      return;
    }

    // =========================
    // 🟣 BODY
    // =========================
    if (data.section !== "body") return;

    if (colIndex === 0) {
      data.cell.styles.fillColor = [255, 255, 255];
      return;
    }

    // =========================
    // 🟣 GIORNI SCOPERTI
    // =========================
    if (uncoveredDays.includes(dayNumber)) {
      data.cell.styles.fillColor = [180, 120, 255];
      data.cell.styles.textColor = [255, 255, 255];
      return;
    }

    // =========================
    // 🟢 CFI
    // =========================
    if (value === "CFI" || value === "CFI/REP") {
      data.cell.styles.fillColor = [102, 187, 106];
      data.cell.styles.textColor = [255, 255, 255];
      return;
    }

    // =========================
    // 🌸 REP / FREP
    // =========================
    if (value === "REP" || value === "FREP") {
      data.cell.styles.fillColor = [255, 182, 193];
      data.cell.styles.textColor = [0, 0, 0];
      return;
    }

    // =========================
    // 🟡 LIC / REC
    // =========================
    if (value === "LIC" || value === "REC") {
      data.cell.styles.fillColor = [255, 235, 59];
      data.cell.styles.textColor = [0, 0, 0];
      return;
    }

    // ⚪ MAL
    if (value === "MAL") {
      data.cell.styles.fillColor = [238, 238, 238];
      data.cell.styles.textColor = [80, 80, 80];
      return;
    }

    // DEFAULT
    data.cell.styles.fillColor = [255, 255, 255];
    data.cell.styles.textColor = [0, 0, 0];
  },

  didDrawCell: function () {}
});
const finalY = pdf.lastAutoTable.finalY;

// 👀 ANTEPRIMA PDF
const blobUrl = pdf.output("bloburl");
window.open(blobUrl, "_blank");

} // chiusura generatePDF

window.addEventListener("DOMContentLoaded", () => {

  const btn = document.getElementById("pdfBtn");

  if (!btn) {
    console.error("pdfBtn non trovato");
    return;
  }

  btn.addEventListener("click", generatePDF);

});
