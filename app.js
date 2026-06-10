/* ======================
   APP JS - VERSIONE PULITA DEFINITIVA
====================== */

/* ======================
   DOM
====================== */
const calendar = document.getElementById("calendar");
const monthTitle = document.getElementById("monthTitle");
const popup = document.getElementById("popup");

/* ======================
   VARIABILI GLOBALI
====================== */
let currentDate = new Date();
let savedEvents = [];
let editingIndex = null;
let CURRENT_USER = null;

/* ======================
   NOMI MESI
====================== */
const monthNames = [
  "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
  "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"
];

/* ======================
   EMPLOYEE MAP
====================== */
const employees = {
  A: "SANTILLO",
  B: "MANUNTA",
  C: "Dipendente C",
  D: "Dipendente D"
};

/* ======================
   FIREBASE (GLOBAL READY)
====================== */
const db = window.db;
const fb = window.firebaseFirestore;

/* ======================
   LOAD EVENTS
====================== */
function loadEventsFromFirebase() {

  fb.onSnapshot(
    fb.collection(db, "events"),
    (snapshot) => {

      savedEvents = [];

      snapshot.forEach(docSnap => {
        const data = docSnap.data();

        savedEvents.push({
          firebaseId: docSnap.id,
          employee: data.employee,
          date: data.date,
          shift: data.shift
        });

      });

      renderCalendar();
    }
  );
}

/* ======================
   CALENDARIO
====================== */
window.renderCalendar = function () {

  calendar.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthTitle.innerText = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let startDay = firstDay - 1;
  if (startDay < 0) startDay = 6;

  /* CELLE VUOTE */
  for (let i = 0; i < startDay; i++) {
    const empty = document.createElement("div");
    empty.classList.add("empty-day");
    calendar.appendChild(empty);
  }

  /* GIORNI */
  for (let day = 1; day <= daysInMonth; day++) {

    const box = document.createElement("div");
    box.classList.add("day");

    const date = `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

    const dayDate = new Date(year, month, day);

    const holidays = [
      "1-1","6-1","25-4","1-5","2-6",
      "15-8","1-11","8-12","25-12","26-12"
    ];

    const isSunday = dayDate.getDay() === 0;
    const isHoliday = holidays.includes(`${day}-${month + 1}`);

    if (isSunday || isHoliday) {
      box.classList.add("holiday-day");
    }

    /* CLICK SOLO ADMIN */
    box.addEventListener("click", () => {
      if (!window.IS_ADMIN) return;

      editingIndex = null;
      openPopup();

      document.getElementById("startDate").value = date;
      document.getElementById("endDate").value = date;
    });

    /* NUMERO GIORNO */
    const num = document.createElement("div");
    num.classList.add("day-number");
    num.innerText = day;
    box.appendChild(num);

    /* EVENTI */
    const selected = document.getElementById("employeeFilter").value;

    const events = savedEvents.filter(ev =>
      ev.date === date &&
      (selected === "ALL" || ev.employee === employees[selected])
    );

    events.forEach(ev => {

      const div = document.createElement("div");
      div.classList.add("event");

      if (["REP","FREP"].includes(ev.shift)) div.classList.add("shift-pink");
      if (["CFI","CFI/REP"].includes(ev.shift)) div.classList.add("shift-green");
      if (["REC","LIC"].includes(ev.shift)) div.classList.add("shift-yellow");

      div.innerHTML = `<div>${ev.shift}</div>`;

      box.appendChild(div);
    });

    calendar.appendChild(box);
  }
};

/* ======================
   NAV
====================== */
window.nextMonth = function () {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
};

window.prevMonth = function () {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
};

/* ======================
   POPUP
====================== */
window.openPopup = function () {
  popup.style.display = "flex";
};

window.closePopup = function () {
  popup.style.display = "none";
};

/* ======================
   SAVE SHIFT (PULITO + LOGICA REP/FREP)
====================== */
window.saveShift = async function () {

  const employee = document.getElementById("employee").value;
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;
  const shift = document.getElementById("shift").value;

  if (!start || !end) {
    alert("Seleziona le date");
    return;
  }

  let current = new Date(start);
  const stop = new Date(end);

  while (current <= stop) {

    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2,"0");
    const d = String(current.getDate()).padStart(2,"0");

    const date = `${y}-${m}-${d}`;

    const isSunday = current.getDay() === 0;

    const holidays = [
      "1-1","6-1","25-4","1-5","2-6",
      "15-8","1-11","8-12","25-12","26-12"
    ];

    const isHoliday = holidays.includes(`${current.getDate()}-${current.getMonth()+1}`);
    const isFestive = isSunday || isHoliday;

    let finalShift = shift;

    /* AUTO REP → FREP */
    if (shift === "REP") {
      finalShift = isFestive ? "FREP" : "REP";
    }

    /* BLOCCO REP */
    if (finalShift === "REP") {
      const count = savedEvents.filter(ev =>
        ev.employee === employee &&
        ev.shift === "REP" &&
        ev.date.startsWith(`${y}-${m}`)
      ).length;

      if (count >= 6) {
        alert("Massimo 6 REP al mese");
        return;
      }
    }

    /* BLOCCO FREP */
    if (finalShift === "FREP") {
      if (!isFestive) {
        alert("FREP solo festivi e domeniche");
        return;
      }

      const count = savedEvents.filter(ev =>
        ev.employee === employee &&
        ev.shift === "FREP" &&
        ev.date.startsWith(`${y}-${m}`)
      ).length;

      if (count >= 2) {
        alert("Massimo 2 FREP al mese");
        return;
      }
    }

    /* SALVATAGGIO */
    if (editingIndex !== null) {

      const ev = savedEvents[editingIndex];

      await fb.updateDoc(
        fb.doc(db, "events", ev.firebaseId),
        { employee, date, shift: finalShift }
      );

    } else {

      await fb.addDoc(
        fb.collection(db, "events"),
        { employee, date, shift: finalShift }
      );

    }

    current.setDate(current.getDate() + 1);
  }

  closePopup();
};

/* ======================
   INIT
====================== */
loadEventsFromFirebase();
renderCalendar();
