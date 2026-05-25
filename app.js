import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const db = window.db;
const calendar = document.getElementById("calendar");
const monthTitle = document.getElementById("monthTitle");
const popup = document.getElementById("popup");

let currentDate = new Date();

const monthNames = [
  "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
  "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"
];

let savedEvents =
  JSON.parse(localStorage.getItem("events")) || [];

let editingIndex = null;



// ======================
// FESTIVI
// ======================
function isHoliday(date){

  const day = date.getDay();
  if(day === 0) return true;

  const month = date.getMonth() + 1;
  const dayNumber = date.getDate();

  const holidays = [
    "1-1","6-1","25-4","1-5","2-6",
    "15-8","1-11","8-12","25-12","26-12"
  ];

  return holidays.includes(`${dayNumber}-${month}`);
}



// ======================
// CONTEGGIO
// ======================
function countMonthlyShift(employee, shift, year, month){

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



// ======================
// RENDER CALENDAR
// ======================
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
  if(startDay < 0) startDay = 6;



  // celle vuote
  for(let i=0;i<startDay;i++){
    const empty = document.createElement("div");
    empty.classList.add("empty-day");
    calendar.appendChild(empty);
  }



  // giorni
  for(let day=1; day<=daysInMonth; day++){

    const dayBox = document.createElement("div");
    dayBox.classList.add("day");



    const loopDate = new Date(year, month, day);

    if(isHoliday(loopDate)){
      dayBox.classList.add("holiday-day");
    }



    // click giorno
    dayBox.addEventListener("click", () => {

      editingIndex = null;
      openPopup();

      const y = loopDate.getFullYear();
      const m = String(loopDate.getMonth()+1).padStart(2,"0");
      const d = String(loopDate.getDate()).padStart(2,"0");

      const formatted = `${y}-${m}-${d}`;

      document.getElementById("startDate").value = formatted;
      document.getElementById("endDate").value = formatted;
    });



    // numero giorno
    const dayNumber = document.createElement("div");
    dayNumber.classList.add("day-number");
    dayNumber.innerText = day;
    dayBox.appendChild(dayNumber);



    // eventi
    const selectedEmployee =
      document.getElementById("employeeFilter").value;

    const events = savedEvents.filter(event => {

      const eventDate = new Date(event.date);

      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === month &&
        eventDate.getFullYear() === year &&
        (selectedEmployee === "ALL" || event.employee === selectedEmployee)
      );
    });



    events.forEach(event => {

      const eventIndex = savedEvents.indexOf(event);

      const eventDiv = document.createElement("div");
      eventDiv.classList.add("event");



      // colori dipendenti
      if(event.employee === "PERCACCIOLI")
        eventDiv.classList.add("percaccioli");

      if(event.employee === "MANUNTA")
        eventDiv.classList.add("manunta");

      if(event.employee === "SANTILLO")
        eventDiv.classList.add("santillo");



      // 👇 FREP SOLO TESTO ROSSO
      eventDiv.innerHTML = `
        <div class="event-shift ${event.shift === "FREP" ? "frep-text" : ""}">
          ${event.shift}
        </div>
      `;



      // click modifica
      eventDiv.addEventListener("click",(e)=>{

        e.stopPropagation();

        editingIndex = eventIndex;

        document.getElementById("employee").value = event.employee;
        document.getElementById("startDate").value = event.date;
        document.getElementById("endDate").value = event.date;
        document.getElementById("shift").value = event.shift;

        openPopup();
      });



      dayBox.appendChild(eventDiv);
    });



    calendar.appendChild(dayBox);
  }
}



// ======================
// POPUP
// ======================
function openPopup(){ popup.style.display="flex"; }
function closePopup(){ popup.style.display="none"; }



// ======================
// SALVA
// ======================
function saveShift(){

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



  // conteggi mensili
  const start = new Date(startDate);

  const year = start.getFullYear();

  const month = start.getMonth();



  let repCount =
    countMonthlyShift(employee,"REP",year,month);

  let frepCount =
    countMonthlyShift(employee,"FREP",year,month);



  // se sto modificando un evento
  // tolgo il vecchio conteggio
  if(editingIndex !== null){

    const oldEvent = savedEvents[editingIndex];

    if(oldEvent.shift === "REP")
      repCount--;

    if(oldEvent.shift === "FREP")
      frepCount--;
  }



  // limite REP
  if(shift.trim() === "REP" && repCount >= 6){

    alert("Massimo 6 REP");

    return;
  }



  // limite FREP
  if(shift.trim() === "FREP" && frepCount >= 2){

    alert("Massimo 2 FREP");

    return;
  }



  // modifica
  if(editingIndex !== null){

    savedEvents[editingIndex] = {

      employee,

      date: startDate,

      shift
    };

  }else{

    let current = new Date(startDate);

    let end = new Date(endDate);



    while(current <= end){

      const d = new Date(current);



      const isSunday =
        d.getDay() === 0;



      const holidays = [

        "1-1","6-1","25-4","1-5","2-6",

        "15-8","1-11","8-12","25-12","26-12"

      ];



      const isItalianHoliday =
        holidays.includes(`${d.getDate()}-${d.getMonth()+1}`);



      const isFestive =
        isSunday || isItalianHoliday;



      // REP solo feriali
      if(shift.trim() === "REP" && isFestive){

        alert("REP solo lun-sab");

        return;
      }



      // FREP solo festivi
      if(shift.trim() === "FREP" && !isFestive){

        alert("FREP solo festivi");

        return;
      }



      savedEvents.push({

        employee,

        date: d.toISOString().split("T")[0],

        shift
      });



      // aggiorna conteggi
      if(shift.trim() === "REP")
        repCount++;

      if(shift.trim() === "FREP")
        frepCount++;



      // blocco durante inserimenti multipli
      if(repCount > 6){

        alert("Massimo 6 REP");

        return;
      }



      if(frepCount > 2){

        alert("Massimo 2 FREP");

        return;
      }



      current.setDate(current.getDate()+1);
    }
  }



  localStorage.setItem("events", JSON.stringify(savedEvents));



  editingIndex = null;

  closePopup();

  renderCalendar();
}

// ======================
// DELETE
// ======================
function deleteShift(){

  if(editingIndex === null) return;

  savedEvents.splice(editingIndex,1);

  localStorage.setItem("events", JSON.stringify(savedEvents));

  editingIndex = null;

  closePopup();
  renderCalendar();
}



// ======================
// NAV
// ======================
function nextMonth(){
  currentDate.setMonth(currentDate.getMonth()+1);
  renderCalendar();
}

function prevMonth(){
  currentDate.setMonth(currentDate.getMonth()-1);
  renderCalendar();
}



// ======================
// PDF EXPORT
// ======================
async function exportPDF(){

  const { jsPDF } = window.jspdf;

  const canvas = await html2canvas(document.querySelector(".app"));

  const pdf = new jsPDF("p","mm","a4");

  const width = pdf.internal.pageSize.getWidth();
  const height = (canvas.height * width) / canvas.width;

  pdf.addImage(canvas.toDataURL("image/png"),"PNG",0,0,width,height);

  pdf.save(`Turni_${monthNames[currentDate.getMonth()]}_${currentDate.getFullYear()}.pdf`);
}



// START
renderCalendar();
