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

function generatePDF(months = 1) {

  const missingMessages = [];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth =
    new Date(year, month + 1, 0).getDate();

  // ======================
  // 🔍 CONTROLLO COPERTURA (RIMANE UGUALE)
  // ======================
  for (let d = 1; d <= daysInMonth; d++) {

    const date =
      `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

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
        `${String(d).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${String(year).slice(-2)}`
      );
    }
  }

  // ======================
  // ⚠️ AVVISO
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
// 📄 PDF INIT (UNICO - FIX ERRORE jsPDF DUPLICATO)
// ======================
const { jsPDF } = window.jspdf;
const pdf = new jsPDF("landscape", "mm", "a4");

const monthNames = [
  "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
  "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"
];

const map = ["D","L","Ma","Me","G","V","S"];

const monthsToPrint = Number(months);
let baseDate = new Date(currentDate);
let startY = 20;

// ======================
// 🔁 LOOP MESI
// ======================
for (let m = 0; m < monthsToPrint; m++) {

  const date = new Date(baseDate.getFullYear(), baseDate.getMonth() + m, 1);

  const year = date.getFullYear();
  const month = date.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // ======================
  // 🟣 GIORNI SCOPERTI (VIOLA)
  // ======================
  const uncoveredDays = new Set();

  for (let d = 1; d <= daysInMonth; d++) {

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

    if (!hasCoverage) {
      uncoveredDays.add(d);
    }
  }

  // ======================
  // 📌 TITOLO MESE
  // ======================
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");

  pdf.text(
    `${monthNames[month]} ${year}`,
    148,
    startY,
    { align: "center" }
  );

  startY += 5;

  // ======================
  // HEADER + BODY (resto tuo invariato)
  // ======================

  const head = [
    ["Nominativi", ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  ];

  const weekdayRow = [
    "",
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const dDate = new Date(year, month, d);
      return map[dDate.getDay()];
    })
  ];

  const dipendenti = Object.keys(EMPLOYEES);

  const body = dipendenti.map(nome => {
    const row = [EMPLOYEES[nome].name];

    for (let d = 1; d <= daysInMonth; d++) {

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

  const dayColWidth = usableWidth / daysInMonth;

  const columnStyles = { 0: { cellWidth: nameColWidth } };

  for (let i = 1; i <= daysInMonth; i++) {
    columnStyles[i] = { cellWidth: dayColWidth };
  }

  // ======================
  // 📊 TABELA PDF
  // ======================
pdf.autoTable({
  head,
  body: [weekdayRow, ...body],

  startY,
  theme: "grid",
  tableWidth: "wrap",
  margin: { left: 3, right: 3 },

  styles: {
    fontSize: 4.5,
    cellPadding: 0.4,
    halign: "center",
    valign: "middle"
  },

  columnStyles,

  // ❌ RIMUOVI pageBreak: "avoid"

  didParseCell: function (data) {

    const colIndex = data.column.index;
    const value = data.cell.raw;

    const dayNumber = colIndex;
    if (colIndex === 0) return;

    const dDate = new Date(year, month, dayNumber);
    const weekday = dDate.getDay();
    const info = getDayInfo(
      `${year}-${String(month + 1).padStart(2,"0")}-${String(dayNumber).padStart(2,"0")}`
    );

    if (data.section === "head") {

      if (colIndex === 0) {
        data.cell.styles.fillColor = [255,255,255];
        return;
      }

      if (weekday === 0 || info.isHoliday) {
        data.cell.styles.fillColor = [255,59,48];
        data.cell.styles.textColor = [255,255,255];
        return;
      }

      if (weekday === 6) {
        data.cell.styles.fillColor = [255,149,0];
        return;
      }

      return;
    }

    if (data.section !== "body") return;

    if (colIndex === 0) {
      data.cell.styles.fillColor = [255,255,255];
      return;
    }

    if (uncoveredDays.has(dayNumber)) {
      data.cell.styles.fillColor = [180,120,255];
      data.cell.styles.textColor = [255,255,255];
      return;
    }

    if (value === "CFI" || value === "CFI/REP") {
      data.cell.styles.fillColor = [102,187,106];
      return;
    }

    if (value === "REP" || value === "FREP") {
      data.cell.styles.fillColor = [255,182,193];
      return;
    }

    if (value === "LIC" || value === "REC") {
      data.cell.styles.fillColor = [255,235,59];
      return;
    }

    if (value === "MAL") {
      data.cell.styles.fillColor = [238,238,238];
      return;
    }
  }
  });

  if (m < monthsToPrint - 1) {
    startY = pdf.lastAutoTable.finalY + 10;
  }

}

const blobUrl = pdf.output("bloburl");
window.open(blobUrl, "_blank");

}
   
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
