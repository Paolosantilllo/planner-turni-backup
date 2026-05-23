const calendar = document.getElementById("calendar");
const monthTitle = document.getElementById("monthTitle");

const popup = document.getElementById("popup");

const currentDate = new Date();

const monthNames = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre"
];

let savedEvents = JSON.parse(localStorage.getItem("events")) || [];

function renderCalendar() {

  calendar.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthTitle.innerText =
    monthNames[month] + " " + year;

  const firstDay =
    new Date(year, month, 1).getDay();

  const daysInMonth =
    new Date(year, month + 1, 0).getDate();

  // Adattamento calendario europeo
  let startDay = firstDay - 1;

  if(startDay < 0){
    startDay = 6;
  }

  // Celle vuote iniziali
  for(let i = 0; i < startDay; i++){

    const emptyDay = document.createElement("div");
    emptyDay.classList.add("empty-day");

    calendar.appendChild(emptyDay);

  }

  // Giorni mese
  for(let day = 1; day <= daysInMonth; day++) {

    const dayBox = document.createElement("div");
    dayBox.classList.add("day");

    dayBox.addEventListener("click", () => {

  openPopup();

  const selectedDate = new Date(year, month, day);

  const formattedDate =
    selectedDate.toISOString().split("T")[0];

  document.getElementById("date").value =
    formattedDate;

});
    const dayNumber = document.createElement("div");
    dayNumber.classList.add("day-number");
    dayNumber.innerText = day;

    dayBox.appendChild(dayNumber);

    const events = savedEvents.filter(event => {

      const eventDate = new Date(event.date);

      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === month &&
        eventDate.getFullYear() === year
      );

    });

    events.forEach(event => {

      const eventDiv = document.createElement("div");
      eventDiv.classList.add("event");

      eventDiv.innerText =
        event.employee + " - " + event.shift;

      dayBox.appendChild(eventDiv);

    });

    calendar.appendChild(dayBox);

  }

}
function openPopup() {
  popup.style.display = "flex";
}

function closePopup() {
  popup.style.display = "none";
}

function saveShift() {

  const employee =
    document.getElementById("employee").value;

  const date =
    document.getElementById("date").value;

  const shift =
    document.getElementById("shift").value;

  if(!date) {
    alert("Seleziona una data");
    return;
  }

  savedEvents.push({
    employee,
    date,
    shift
  });

  localStorage.setItem(
    "events",
    JSON.stringify(savedEvents)
  );

  closePopup();

  renderCalendar();

}

renderCalendar();
