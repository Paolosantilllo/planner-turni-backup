const calendar = document.getElementById("calendar");
const monthTitle = document.getElementById("monthTitle");

const popup = document.getElementById("popup");

let currentDate = new Date();

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

let savedEvents =
  JSON.parse(localStorage.getItem("events")) || [];

let editingIndex = null;



function isHoliday(date){

  const day = date.getDay();

  // Domenica
  if(day === 0){
    return true;
  }

  const month = date.getMonth() + 1;
  const dayNumber = date.getDate();

  const holidays = [
    "1-1",
    "6-1",
    "25-4",
    "1-5",
    "2-6",
    "15-8",
    "1-11",
    "8-12",
    "25-12",
    "26-12"
  ];

  return holidays.includes(
    `${dayNumber}-${month}`
  );

}



function countMonthlyShift(
  employee,
  shift,
  year,
  month
){

  return savedEvents.filter(event => {

    const d = new Date(event.date);

    return (
      event.employee === employee &&
      event.shift === shift &&
      d.getFullYear() === year &&
      d.getMonth() === month
    );

  }).length;

}



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

    // CLICK GIORNO
    dayBox.addEventListener("click", () => {

      editingIndex = null;

      openPopup();

      const selectedDate =
        new Date(year, month, day);

      const formattedDate =
        selectedDate.toISOString().split("T")[0];

      document.getElementById("startDate").value =
        formattedDate;

      document.getElementById("endDate").value =
        formattedDate;

    });

    const dayNumber = document.createElement("div");
    dayNumber.classList.add("day-number");
    dayNumber.innerText = day;

    dayBox.appendChild(dayNumber);

  const selectedEmployee =
  document.getElementById("employeeFilter").value;

const events = savedEvents.filter(event => {

  const eventDate = new Date(event.date);

  const sameDay = (

    eventDate.getDate() === day &&
    eventDate.getMonth() === month &&
    eventDate.getFullYear() === year

  );

  const employeeMatch = (

    selectedEmployee === "ALL" ||

    event.employee === selectedEmployee

  );

  return sameDay && employeeMatch;

});

    events.forEach(event => {

      const eventIndex =
        savedEvents.indexOf(event);

      const eventDiv =
        document.createElement("div");

      eventDiv.classList.add("event");

      // COLORI DIPENDENTI
      if(event.employee === "PERCACCIOLI"){
        eventDiv.classList.add("percaccioli");
      }

      if(event.employee === "MANUNTA"){
        eventDiv.classList.add("manunta");
      }

      if(event.employee === "SANTILLO"){
        eventDiv.classList.add("santillo");
      }

      // FREP ROSSO
      if(event.shift === "FREP"){
        eventDiv.classList.add("frep");
      }

      eventDiv.innerHTML = `
        <div class="event-name">
          ${event.employee}
        </div>

        <div class="event-shift">
          ${event.shift}
        </div>
      `;

      // CLICK MODIFICA EVENTO
      eventDiv.addEventListener("click", (e) => {

        e.stopPropagation();

        editingIndex = eventIndex;

        document.getElementById("employee").value =
          event.employee;

        document.getElementById("startDate").value =
          event.date;

        document.getElementById("endDate").value =
          event.date;

        document.getElementById("shift").value =
          event.shift;

        openPopup();

      });

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

  const startDate =
    document.getElementById("startDate").value;

  const endDate =
    document.getElementById("endDate").value;

  const shift =
    document.getElementById("shift").value;

  if(!startDate || !endDate){

    alert("Seleziona le date");

    return;

  }

  // MODIFICA EVENTO
  if(editingIndex !== null){

    savedEvents[editingIndex] = {

      employee,

      date: startDate,

      shift

    };

  }else{

    let current =
      new Date(startDate);

    let end =
      new Date(endDate);

    while(current <= end){

      const currentDate =
        new Date(current);

      const year =
        currentDate.getFullYear();

      const month =
        currentDate.getMonth();

      // REP
      if(shift === "REP"){

        if(isHoliday(currentDate)){

          alert(
            "REP può essere inserito solo nei giorni feriali"
          );

          return;

        }

        const repCount =
          countMonthlyShift(
            employee,
            "REP",
            year,
            month
          );

        if(repCount >= 6){

          alert(
            employee +
            " ha già 6 REP questo mese"
          );

          return;

        }

      }

      // FREP
      if(shift === "FREP"){

        if(!isHoliday(currentDate)){

          alert(
            "FREP può essere inserito solo nei festivi"
          );

          return;

        }

        const frepCount =
          countMonthlyShift(
            employee,
            "FREP",
            year,
            month
          );

        if(frepCount >= 2){

          alert(
            employee +
            " ha già 2 FREP questo mese"
          );

          return;

        }

      }

      savedEvents.push({

        employee,

        date:
          currentDate
          .toISOString()
          .split("T")[0],

        shift

      });

      current.setDate(
        current.getDate() + 1
      );

    }

  }

  localStorage.setItem(
    "events",
    JSON.stringify(savedEvents)
  );

  editingIndex = null;

  closePopup();

  renderCalendar();

}



function deleteShift(){

  if(editingIndex === null) return;

  savedEvents.splice(editingIndex, 1);

  localStorage.setItem(
    "events",
    JSON.stringify(savedEvents)
  );

  editingIndex = null;

  closePopup();

  renderCalendar();

}



// CHIUSURA POPUP CLICK FUORI
popup.addEventListener("click", (e) => {

  if(e.target === popup){

    closePopup();

  }

});



renderCalendar();
