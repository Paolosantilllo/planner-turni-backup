const calendar = document.getElementById("calendar");
const monthTitle = document.getElementById("monthTitle");
const popup = document.getElementById("popup");

let currentDate = new Date();
let savedEvents = [];
let editingIndex = null;

const monthNames = [
  "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
  "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"
];

const CURRENT_USER = {
  name: "SANTILLO",
  role: "admin"
};

// ======================
// FIREBASE
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

  if (!calendar) return;

  calendar.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthTitle.innerText = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let startDay = firstDay - 1;
  if (startDay < 0) startDay = 6;

  // celle vuote
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

    if (currentDay.getDay() === 0 || holidays.includes(`${day}-${month + 1}`)) {
      dayBox.classList.add("holiday-day");
    }

    dayBox.onclick = () => {
      editingIndex = null;
      openPopup();

      document.getElementById("startDate").value = formatted;
      document.getElementById("endDate").value = formatted;
    };

    const num = document.createElement("div");
    num.classList.add("day-number");
    num.innerText = day;
    dayBox.appendChild(num);

    const filter = document.getElementById("employeeFilter")?.value || "ALL";

    const events = savedEvents.filter(e =>
      e.date === formatted &&
      (filter === "ALL" || e.employee === filter)
    );

    events.forEach(ev => {

      const div = document.createElement("div");
      div.classList.add("event");

      div.innerHTML = `<div class="event-shift">${ev.shift}</div>`;

      div.onclick = (e) => {
        e.stopPropagation();

        editingIndex = savedEvents.findIndex(x => x.firebaseId === ev.firebaseId);

        document.getElementById("employee").value = ev.employee;
        document.getElementById("startDate").value = ev.date;
        document.getElementById("endDate").value = ev.date;
        document.getElementById("shift").value = ev.shift;

        openPopup();
      };

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
// POPUP
// ======================
function openPopup() {
  popup.style.display = "flex";
}

function closePopup() {
  popup.style.display = "none";
}

// ======================
// INIT
// ======================
window.addEventListener("load", () => {
  setTimeout(() => {
    loadEventsFromFirebase();
    renderCalendar();
  }, 300);
});

// ======================
// SAVE SHIFT (BASE)
// ======================
async function saveShift() {

  const employee = document.getElementById("employee").value;
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;
  const shift = document.getElementById("shift").value;

  if (!start || !end) return alert("Seleziona date");

  let current = new Date(start);
  let stop = new Date(end);

  while (current <= stop) {

    const date =
      `${current.getFullYear()}-${String(current.getMonth()+1).padStart(2,"0")}-${String(current.getDate()).padStart(2,"0")}`;

    const exists = savedEvents.some(ev =>
      ev.employee === employee &&
      ev.date === date &&
      (!editingIndex || ev.firebaseId !== savedEvents[editingIndex]?.firebaseId)
    );

    if (!exists) {

      if (editingIndex !== null) {

        await window.firebaseFirestore.updateDoc(
          window.firebaseFirestore.doc(window.db, "events", savedEvents[editingIndex].firebaseId),
          { employee, date, shift }
        );

      } else {

        await window.firebaseFirestore.addDoc(
          window.firebaseFirestore.collection(window.db, "events"),
          { employee, date, shift }
        );
      }
    }

    current.setDate(current.getDate() + 1);
  }

  closePopup();
}

// ======================
// DELETE
// ======================
async function deleteShift() {

  if (editingIndex === null) return;

  const ev = savedEvents[editingIndex];

  if (ev?.firebaseId) {
    await window.firebaseFirestore.deleteDoc(
      window.firebaseFirestore.doc(window.db, "events", ev.firebaseId)
    );
  }

  closePopup();
}

// ======================
// NAV MONTH
// ======================
function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
}

function prevMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
}
