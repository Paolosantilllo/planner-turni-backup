
const calendar = document.getElementById("calendar");
const monthTitle = document.getElementById("monthTitle");
const popup = document.getElementById("popup");

let currentDate = new Date();

const monthNames = [
  "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
  "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"
];

let savedEvents = [];
let editingEvent = null;

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

  monthTitle.innerText = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let startDay = firstDay - 1;
  if (startDay < 0) startDay = 6;

  // empty cells
  for (let i = 0; i < startDay; i++) {
    const empty = document.createElement("div");
    empty.classList.add("empty-day");
    calendar.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {

    const dayBox = document.createElement("div");
    dayBox.classList.add("day");

    const formatted =
      `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const currentDay = new Date(year, month, day);

    const holidays = ["1-1","6-1","25-4","1-5","2-6","15-8","1-11","8-12","25-12","26-12"];

    const isSunday = currentDay.getDay() === 0;
    const isHoliday = holidays.includes(`${day}-${month + 1}`);

    if (isSunday || isHoliday) {
      dayBox.classList.add("holiday-day");
    }

    // CLICK DAY
    dayBox.addEventListener("click", () => {
      editingEvent = null;

      openPopup();

      document.getElementById("employee").value = "";
      document.getElementById("startDate").value = formatted;
      document.getElementById("endDate").value = formatted;
    });

    // number
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

      div.classList.add(event.employee.toLowerCase().replace(" ", "-"));

      div.innerHTML = `<div class="event-shift">${event.shift}</div>`;

      div.addEventListener("click", (e) => {
        e.stopPropagation();

        editingEvent = event;

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
// SAVE SHIFT (FIXED)
// ======================
async function saveShift() {

  const employee = document.getElementById("employee").value;
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;
  const shift = document.getElementById("shift").value;

  if (!start || !end) {
    alert("Seleziona le date");
    return;
  }

  let startDate = new Date(start);
  let endDate = new Date(end);

  let dates = [];

  while (startDate <= endDate) {
    const y = startDate.getFullYear();
    const m = String(startDate.getMonth() + 1).padStart(2, "0");
    const d = String(startDate.getDate()).padStart(2, "0");

    dates.push(`${y}-${m}-${d}`);

    startDate.setDate(startDate.getDate() + 1);
  }

  // DUPLICATI CHECK PRIMA DEL SALVATAGGIO
  for (const date of dates) {
    const exists = savedEvents.some(ev =>
      ev.employee === employee &&
      ev.date === date &&
      (!editingEvent || ev.firebaseId !== editingEvent.firebaseId)
    );

    if (exists) {
      alert("Duplicato trovato: " + date);
      return;
    }
  }

  for (const date of dates) {

    const payload = { employee, date, shift };

    if (editingEvent) {

      await window.firebaseFirestore.updateDoc(
        window.firebaseFirestore.doc(window.db, "events", editingEvent.firebaseId),
        payload
      );

    } else {

      await window.firebaseFirestore.addDoc(
        window.firebaseFirestore.collection(window.db, "events"),
        payload
      );
    }  }

  renderCalendar();
  closePopup();
}
// ======================
// DELETE
// ======================
async function deleteShift() {

  if (!editingEvent) return;

  await window.firebaseFirestore.deleteDoc(
    window.firebaseFirestore.doc(window.db, "events", editingEvent.firebaseId)
  );

  closePopup();
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
  loadEventsFromFirebase();
  renderCalendar();
});
// ======================
// POPUP
// ======================
function openPopup() {
  popup.style.display = "flex";
}

function closePopup() {
  popup.style.display = "none";
}

// ======================
// SHARE MAIL
// ======================
async function shareByEmail() {

  let text = "CALENDARIO TURNI\n\n";

  savedEvents.forEach(ev => {
    text += `${ev.date} - ${ev.employee} - ${ev.shift}\n`;
  });

  const subject = encodeURIComponent("Calendario Turni");
  const body = encodeURIComponent(text);

  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

// ======================
// CHANGE SHIFT
// ======================
function requestShiftChange() {

  const employee = document.getElementById("employee").value;
  const start = document.getElementById("startDate").value;

  if (!employee || !start) {
    alert("Seleziona turno");
    return;
  }

  alert(
    `Richiesta cambio turno inviata:\n${employee}\n${start}`
  );
}

// ======================
// BUTTON +
// ======================
document.getElementById("addButton").addEventListener("click", () => {

  editingEvent = null;

  document.getElementById("employee").value = "";
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  document.getElementById("shift").value = "";

  openPopup();
});
