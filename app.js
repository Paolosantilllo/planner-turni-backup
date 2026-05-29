


const calendar = document.getElementById("calendar");
const monthTitle = document.getElementById("monthTitle");
const popup = document.getElementById("popup");

let currentDate = new Date();

const monthNames = [
  "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
  "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"
];

let savedEvents = [];
let editingIndex = null;

const CURRENT_USER = {
  name: "SANTILLO",
  role: "admin"
};

// ======================
// FIREBASE LOAD
// ======================
function loadEventsFromFirebase() {
  if (!window.firebaseFirestore || !window.db) return;

  window.firebaseFirestore.onSnapshot(
    window.firebaseFirestore.collection(window.db, "events"),
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

// ======================
// CALENDAR
// ======================
function renderCalendar() {

  calendar.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthTitle.innerText = monthNames[month] + " " + year;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let startDay = firstDay - 1;
  if (startDay < 0) startDay = 6;

  for (let i = 0; i < startDay; i++) {
    const empty = document.createElement("div");
    empty.classList.add("empty-day");
    calendar.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {

    const dayBox = document.createElement("div");
    dayBox.classList.add("day");

    const formatted =
      `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

    const currentDay = new Date(year, month, day);

    const holidays = [
      "1-1","6-1","25-4","1-5","2-6",
      "15-8","1-11","8-12","25-12","26-12"
    ];

    const isSunday = currentDay.getDay() === 0;
    const isHoliday = holidays.includes(`${day}-${month + 1}`);

    if (isSunday || isHoliday) {
      dayBox.classList.add("holiday-day");
    }

    dayBox.addEventListener("click", () => {
      editingIndex = null;
      openPopup();

      document.getElementById("startDate").value = formatted;
      document.getElementById("endDate").value = formatted;
    });

    const num = document.createElement("div");
    num.classList.add("day-number");
    num.innerText = day;

    dayBox.appendChild(num);

    const selectedEmployee = document.getElementById("employeeFilter").value;

    const events = savedEvents.filter(e =>
      e.date === formatted &&
      (selectedEmployee === "ALL" || e.employee === selectedEmployee)
    );

    events.forEach(event => {

      const div = document.createElement("div");
      div.classList.add("event");

      if (event.employee === "Dipendente D") div.classList.add("dipendente-d");
      if (event.employee === "Dipendente C") div.classList.add("dipendente-c");
      if (event.employee === "Dipendente B") div.classList.add("dipendente-b");
      if (event.employee === "Dipendente A") div.classList.add("dipendente-a");

      div.innerHTML = `<div class="event-shift">${event.shift}</div>`;

      div.addEventListener("click", (e) => {
        e.stopPropagation();

        editingIndex = savedEvents.findIndex(x => x.firebaseId === event.firebaseId);

        document.getElementById("employee").value = event.employee;
        document.getElementById("startDate").value = event.date;
        document.getElementById("endDate").value = event.date;
        document.getElementById("shift").value = event.shift;

        openPopup();
      });

      dayBox.appendChild(div);
    });

    calendar.appendChild(dayBox);
  }
}

// ======================
// NAV
// ======================
function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
}

function prevMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
}

// ======================
// INIT
// ======================
window.addEventListener("load", () => {
  setTimeout(() => {
    loadEventsFromFirebase();
    renderCalendar();
  }, 500);
});

// ======================
// GENERA PDF (FIXATO)
// ======================
async function generatePDF() {

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const employees = [
    "Dipendente D",
    "Dipendente C",
    "Dipendente B",
    "Dipendente A"
  ];

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("landscape", "mm", "a4");

  pdf.setFontSize(12);
  pdf.text(
    `Reperibilità mese di ${monthNames[month]}`,
    148,
    15,
    { align: "center" }
  );

  const startX = 15;
  const startY = 25;
  const nameW = 30;
  const cellW = 5;
  const cellH = 6;

  // HEADER GIORNI
  for (let d = 1; d <= daysInMonth; d++) {
    const x = startX + nameW + (d - 1) * cellW;

    pdf.setFillColor(235, 235, 235);
    pdf.rect(x, startY, cellW, cellH, "FD");

    pdf.setFontSize(4);
    pdf.text(String(d), x + 1, startY + 4);
  }

  const weekDays = ["D","L","Ma","Me","G","V","S"];

  for (let d = 1; d <= daysInMonth; d++) {

    const x = startX + nameW + (d - 1) * cellW;

    const current = new Date(year, month, d);
    const dayName = weekDays[current.getDay()];

    pdf.setFillColor(
      dayName === "D" ? 244 : dayName === "S" ? 255 : 245,
      dayName === "D" ? 67 : dayName === "S" ? 152 : 245,
      dayName === "D" ? 54 : dayName === "S" ? 0 : 245
    );

    pdf.rect(x, startY + cellH, cellW, cellH, "FD");

    pdf.setFontSize(5);
    pdf.text(dayName, x + 1, startY + cellH + 4);
  }

  // ===== RIGHE DIPENDENTI (FIX IMPORTANTE) =====
  employees.forEach((emp, row) => {

    const y = startY + 20 + (row * 10); // ✅ FIX SPAZIATURA

    pdf.setFillColor(255,255,255);
    pdf.rect(startX, y, nameW, cellH, "FD");

    pdf.setFontSize(6);
    pdf.text(emp, startX + 2, y + 5);

    for (let d = 1; d <= daysInMonth; d++) {

      const x = startX + nameW + (d - 1) * cellW;

      const date =
        `${year}-${String(month + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

      const ev = savedEvents.find(e =>
        e.employee === emp && e.date === date
      );

      let color = [255,255,255];

      if (ev?.shift === "REP") color = [231,193,181];
      if (ev?.shift === "FREP") color = [216,176,163];
      if (ev?.shift === "CFI") color = [159,190,114];
      if (ev?.shift === "CFI/REP") color = [183,207,138];

      pdf.setFillColor(...color);
      pdf.rect(x, y, cellW, cellH, "FD");

      if (ev) {
        pdf.setFontSize(4);
        pdf.text(ev.shift, x + 0.5, y + 4);
      }
    }
  });

  const pdfBlob = pdf.output("blob");
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, "_blank");
}
