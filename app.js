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

/* ======================
   UTENTE LOGGATO
====================== */
let CURRENT_USER = null;

console.log("APP JS CARICATO");
console.log("AUTH =", window.auth);
console.log("DB =", window.db);
/* ======================
   MAPPA UTENTI
====================== */
function getEmployeeFromEmail(email){

  const users = {

    "paolosantillo@yahoo.it":
      "Dipendente A",

    "dipb.planner@gmail.com":
      "Dipendente B",

    "dipc.planner@gmail.com":
      "Dipendente C",

    "dipd.planner@gmail.com":
      "Dipendente D"
  };

  return users[email] || null;
}

/* ======================
   FIREBASE AUTH
====================== */

import { onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const appDiv = document.querySelector(".app");

// 🔥 NASCONDE SUBITO L'APP (evita flash)
if (appDiv) appDiv.style.display = "none";

onAuthStateChanged(window.auth, (user) => {

  // 🔴 NON LOGGATO
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // 🟢 LOGGATO
  CURRENT_USER = user.email;
  window.CURRENT_EMPLOYEE = getEmployeeFromEmail(user.email);

  window.IS_ADMIN =
  user.email === "paolosantillo@yahoo.it";
  
  console.log("Utente:", CURRENT_USER);
  console.log("Dipendente:", window.CURRENT_EMPLOYEE);

// 🔥 MOSTRA APP SOLO DOPO LOGIN
if (appDiv) {
  appDiv.style.display = "block";
}

if (!window.IS_ADMIN) {

  document.querySelector(".add-btn").style.display = "none";

  document.querySelector(".monthly-send").style.display = "none";

}

// 🔥 AVVIO APP
loadEventsFromFirebase();
loadRequests();
loadNotifications();

  // 🔥 AVVIO APP
  loadEventsFromFirebase();
  loadRequests();
  loadNotifications();

});
window.logout = function () {
  window.auth.signOut().then(() => {
    window.location.href = "login.html";
  });
};
document
  .getElementById("employeeFilter")
  .addEventListener("change", () => {
    renderCalendar();
  });
/* ======================
   FIREBASE LOAD
====================== */
function loadEventsFromFirebase(){

  console.log("Firebase avviato");

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

      console.log(
        "Eventi caricati:",
        savedEvents.length
      );

      renderCalendar();

    }
  );
}


/* ======================
   FIREBASE NOTIFICATIONS
====================== */
function loadNotifications(){

  if(
    !window.firebaseFirestore ||
    !window.db ||
    !CURRENT_USER
  ) return;

  window.firebaseFirestore.onSnapshot(

    window.firebaseFirestore.collection(
      window.db,
      "notifications"
    ),

    (snapshot) => {

      const myNotifications = [];

      snapshot.forEach(docSnap => {

        const data = docSnap.data();

        if(data.to === CURRENT_USER){

          myNotifications.push({
            id: docSnap.id,
            message: data.message,
            type: data.type,
            read: data.read
          });

        }

      });

      console.log(
        "NOTIFICHE:",
        myNotifications
      );

      window.myNotifications =
        myNotifications;

    }
  );
}

// ======================
// CALENDAR
// ======================
function renderCalendar(){

  console.log("renderCalendar eseguita");

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



  // CELLE VUOTE
  for(let i=0;i<startDay;i++){

    const empty =
      document.createElement("div");

    empty.classList.add("empty-day");

    calendar.appendChild(empty);
  }



  // GIORNI
  for(let day=1; day<=daysInMonth; day++){

    const dayBox =
      document.createElement("div");

    dayBox.classList.add("day");



    const formatted =
      `${year}-${
        String(month + 1).padStart(2,"0")
      }-${
        String(day).padStart(2,"0")
      }`;

// FESTIVI ITALIANI
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

const currentDay =
  new Date(year, month, day);

const isSunday =
  currentDay.getDay() === 0;

const isHoliday =
  holidays.includes(
    `${day}-${month + 1}`
  );

if(isSunday || isHoliday){

  dayBox.classList.add("holiday-day");

}

    // CLICK GIORNO
    dayBox.addEventListener("click",()=>{

      editingIndex = null;

      openPopup();

      document.getElementById("startDate").value =
        formatted;

      document.getElementById("endDate").value =
        formatted;

    });



    // NUMERO
    const num =
      document.createElement("div");

    num.classList.add("day-number");

    num.innerText = day;

    dayBox.appendChild(num);



    // EVENTI
    const selectedEmployee =
      document.getElementById("employeeFilter").value;


const events =
      savedEvents.filter(e =>

        e.date === formatted &&

        (
          selectedEmployee === "ALL" ||
          e.employee === selectedEmployee
        )

      );



    events.forEach(event => {

      const div =
        document.createElement("div");

      div.classList.add("event");



      if(event.employee === "Dipendente D"){
        div.classList.add("dipendente-d");
      }

      if(event.employee === "Dipendente C"){
        div.classList.add("dipendente-c");
      }

      if(event.employee === "Dipendente B"){
        div.classList.add("dipendente-b");
      }

      if(event.employee === "Dipendente A"){
        div.classList.add("dipendente-a");
      }



      div.innerHTML = `
        <div class="event-shift">
          ${event.shift}
        </div>
      `;



      // MODIFICA
      div.addEventListener("click",(e)=>{

        e.stopPropagation();

        editingIndex =
          savedEvents.indexOf(event);

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



      dayBox.appendChild(div);

    });



    calendar.appendChild(dayBox);
  }
}



// ======================
// CAMBIO TURNO
// ======================
window.loadChangeDays = function (){

 const fromEmployee =
  window.CURRENT_EMPLOYEE;

  const toEmployee =
    document.getElementById("changeTo").value;

  const selectedShift =
    document.getElementById("changeShift").value;

  const calFrom =
    document.getElementById("miniGridFrom");

  const calTo =
    document.getElementById("miniGridTo");

  calFrom.innerHTML = "";
  calTo.innerHTML = "";

  const year =
    currentDate.getFullYear();

  const month =
    currentDate.getMonth();

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

  let selectedFrom = null;
  let selectedTo = null;


  function buildCalendar(container, events, isFrom){

    container.innerHTML = "";



    const firstDay =
      new Date(year, month, 1).getDay();

    let startDay = firstDay - 1;

    if(startDay < 0){
      startDay = 6;
    }



    // CELLE VUOTE
    for(let i=0;i<startDay;i++){

      const empty =
        document.createElement("div");

      empty.classList.add("mini-day");
      empty.classList.add("disabled");

      container.appendChild(empty);
    }



    // GIORNI
    for(let d=1; d<=daysInMonth; d++){

      const iso =
        `${year}-${
          String(month + 1).padStart(2,"0")
        }-${
          String(d).padStart(2,"0")
        }`;



      const div =
        document.createElement("div");

      div.classList.add("mini-day");

      div.innerText = d;



      const hasEvent =
        events.some(ev => ev.date === iso);



      if(!hasEvent){

        div.classList.add("disabled");
      }



      div.addEventListener("click",()=>{

        if(!hasEvent) return;



        container
          .querySelectorAll(".mini-day")
          .forEach(el => {

            el.classList.remove("selected");

          });



        div.classList.add("selected");



        if(isFrom){

          selectedFrom = iso;

          document.getElementById(
            "selectedFromText"
          ).innerText = iso;



          document
            .getElementById("changeCalendarFrom")
            .classList.add("hidden-calendar");

        }else{

          selectedTo = iso;

          document.getElementById(
            "selectedToText"
          ).innerText = iso;



          document
            .getElementById("changeCalendarTo")
            .classList.add("hidden-calendar");
        }

      });



      container.appendChild(div);
    }
  }



  // COSTRUISCI CALENDARI
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



  // SALVA DATE
  window._changeData = {

    getFromDate: ()=>selectedFrom,

    getToDate: ()=>selectedTo

  };

}

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
}



// ======================
// // ======================
// POPUP
// ======================
window.openPopup = function () {

  if (!window.IS_ADMIN) {
    return;
  }

  popup.style.display = "flex";
}

window.closePopup = function () {

  popup.style.display = "none";
}



// ======================
// POPUP CAMBIO TURNO
// ======================
window.openChangePopup = function () {
  const popup = document.getElementById("changePopup");
  popup.style.display = "flex";

  loadChangeDays();
}

window.closeChangePopup = function () {
  document.getElementById("changePopup").style.display = "none";
}


// ======================
// POPUP RICHIESTE CAMBIO
// ======================
window.openRequestsPopup = function () {
  document.getElementById("requestsPopup").style.display = "flex";

  // opzionale ma consigliato: ricarica sempre le richieste quando apri
  // loadRequests();
}

window.closeRequestsPopup = function () {
  document.getElementById("requestsPopup").style.display = "none";
}

// ======================
// SAVE SHIFT
// ======================
window.saveShift = async function () {

  if (!window.IS_ADMIN) {
    return;
  }

  const employee =
    document.getElementById("employee").value;

  const start =
    document.getElementById("startDate").value;

  const end =
    document.getElementById("endDate").value;

  const shift =
    document.getElementById("shift").value;



  if(!start || !end){

    alert("Seleziona le date");

    return;
  }



  const startParts = start.split("-");
  const endParts = end.split("-");



  let current = new Date(

    Number(startParts[0]),
    Number(startParts[1]) - 1,
    Number(startParts[2])

  );



  let stop = new Date(

    Number(endParts[0]),
    Number(endParts[1]) - 1,
    Number(endParts[2])

  );



  while(current <= stop){

    const y =
      current.getFullYear();

    const m =
      String(
        current.getMonth() + 1
      ).padStart(2,"0");

    const d =
      String(
        current.getDate()
      ).padStart(2,"0");



    const date =
  `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;


    const day =
      current.getDay();

    const month =
      current.getMonth()+1;

    const dayNumber =
      current.getDate();



    // FESTIVI
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



    const isHoliday =
      holidays.includes(
        `${dayNumber}-${month}`
      );



    const isSunday =
      day === 0;



    const isFestive =
      isSunday || isHoliday;



    // ======================
    // BLOCCO REP
    // ======================
    if(shift === "REP"){

     if(isFestive){

        alert(
          "REP non consentito la domenica"
        );

        return;
      }



      const repCount =
        savedEvents.filter(ev => {

          const parts =
            ev.date.split("-");

          const evMonth =
            Number(parts[1]) - 1;

          const evYear =
            Number(parts[0]);



          return (

            ev.employee === employee &&
            ev.shift === "REP" &&

            evMonth === current.getMonth() &&
            evYear === current.getFullYear()

          );

        }).length;



      if(repCount >= 6){

        alert(
          "Massimo 6 REP al mese"
        );

        return;
      }
    }



    // ======================
    // BLOCCO FREP
    // ======================
    if(shift === "FREP"){

      if(!isFestive){

        alert(
          "FREP solo domenica e festivi"
        );

        return;
      }



      const frepCount =
        savedEvents.filter(ev => {

          const parts =
            ev.date.split("-");

          const evMonth =
            Number(parts[1]) - 1;

          const evYear =
            Number(parts[0]);



          return (

            ev.employee === employee &&
            ev.shift === "FREP" &&

            evMonth === current.getMonth() &&
            evYear === current.getFullYear()

          );

        }).length;



      if(frepCount >= 2){

        alert(
          "Massimo 2 FREP al mese"
        );

        return;
      }
    }
    // ======================
    // UN SOLO TURNO AL GIORNO
    // ======================
    const alreadyExists =
  savedEvents.some(ev =>

    ev.employee === employee &&
    ev.date === date &&
    ev.firebaseId !== (
      editingIndex !== null
        ? savedEvents[editingIndex].firebaseId
        : null
    )

  );


    if(alreadyExists){

      alert(
        "Questo dipendente ha già un turno in questo giorno"
      );

      return;
    }


    // ======================
    // UN SOLO REP AL GIORNO
    // ======================
    if(shift === "REP"){

      const repExists =
  savedEvents.some(ev =>

    ev.date === date &&
    ev.shift === "REP" &&
    ev.firebaseId !== (
      editingIndex !== null
        ? savedEvents[editingIndex].firebaseId
        : null
    )

  );



      if(repExists){

        alert(
          "Esiste già un REP in questo giorno"
        );

        return;
      }
    }



    // ======================
    // UN SOLO FREP AL GIORNO
    // ======================
    if(shift === "FREP"){

      const frepExists =
  savedEvents.some(ev =>

    ev.date === date &&
    ev.shift === "FREP" &&
    ev.firebaseId !== (
      editingIndex !== null
        ? savedEvents[editingIndex].firebaseId
        : null
    )

  );



      if(frepExists){

        alert(
          "Esiste già un FREP in questo giorno"
        );

        return;
      }
    }

   // ======================
// SALVA / MODIFICA
// ======================
if(editingIndex !== null){

  const oldEvent =
    savedEvents[editingIndex];

  await window.firebaseFirestore.updateDoc(

    window.firebaseFirestore.doc(
      window.db,
      "events",
      oldEvent.firebaseId
    ),

    {
      employee,
      date,
      shift
    }

  );

}else{

  await window.firebaseFirestore.addDoc(

    window.firebaseFirestore.collection(
      window.db,
      "events"
    ),

    {
      employee,
      date,
      shift
    }

  );

}


    current.setDate(
      current.getDate()+1
    );
  }



  closePopup();
}



// ======================
// DELETE SHIFT
// ======================
window.deleteShift = async function (){

  if (!window.IS_ADMIN) {
    return;
  }

  if(editingIndex === null)
    return;

  const ev =
    savedEvents[editingIndex];



  if(ev.firebaseId){

    await window.firebaseFirestore.deleteDoc(

      window.firebaseFirestore.doc(
        window.db,
        "events",
        ev.firebaseId
      )

    );
  }



  closePopup();
}



// ======================
// CAMBIO TURNO
// ======================
window.sendChangeRequest = async function (){

  const fromEmployee =
  window.CURRENT_EMPLOYEE;
  
  const toEmployee =
    document.getElementById("changeTo").value;

  const fromDate = window._changeData.getFromDate();
  const toDate = window._changeData.getToDate();

  const shift =
    document.getElementById("changeShift").value;

  if(!fromDate || !toDate){
    alert("Seleziona entrambe le date");
    return;
  }

  // 🔥 CREA RICHIESTA (NON TOCCA EVENTS)
  await window.firebaseFirestore.addDoc(
    window.firebaseFirestore.collection(window.db, "changeRequests"),
    {
      fromEmployee,
      toEmployee,
      fromDate,
      toDate,
      shift,
      status: "PENDING_C",
      createdAt: Date.now()
    }
  );

  // 🔔 NOTIFICA A C
  await window.firebaseFirestore.addDoc(
    window.firebaseFirestore.collection(window.db, "notifications"),
    {
      to: toEmployee,
      message: `Richiesta cambio turno da ${fromEmployee}`,
      type: "info",
      read: false,
      createdAt: Date.now()
    }
  );

  alert("Richiesta inviata");
  closeChangePopup();
}
// ======================
// NAV
// ======================
window.nextMonth = function () {

  currentDate.setMonth(
    currentDate.getMonth()+1
  );

  renderCalendar();
}
window.prevMonth = function () {

  currentDate.setMonth(
    currentDate.getMonth()-1
  );

  renderCalendar();
}


// ======================
// GENERA PDF
// ======================
window.generatePDF = async function () {





  // ======================
  // CONTROLLO COPERTURA
  // ======================

  const year =
    currentDate.getFullYear();

  const month =
    currentDate.getMonth();

  const daysCheck =
    new Date(
      year,
      month + 1,
      0
    ).getDate();



  // FESTIVI
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



  let missingMessages = [];



  // TUTTE LE CELLE




  for(let d=1; d<=daysCheck; d++){

    const date =
      `${year}-${
        String(month + 1).padStart(2,"0")
      }-${
        String(d).padStart(2,"0")
      }`;



    // CONTROLLO COPERTURA
    const hasCoverage =
      savedEvents.some(ev =>

        ev.date === date &&

        (
          ev.shift === "REP" ||
          ev.shift === "FREP" ||
          ev.shift === "CFI/REP"
        )

      );



    // GIORNO SCOPERTO
    if(!hasCoverage){

      missingMessages.push(
        `${d} → nessuna reperibilità`
      );  
    }
  }



  // AVVISO
  if(missingMessages.length > 0){

    const proceed = confirm(

      "ATTENZIONE\n\n" +

      missingMessages.join("\n") +

      "\n\nVuoi inviare comunque il mensile?"

    );



    // ANNULLA
    if(!proceed){

      return;
    }
  }



  const { jsPDF } = window.jspdf;
  const pdf =
    new jsPDF(
      "landscape",
      "mm",
      "a4"
    );



  // TITOLO
  pdf.setFontSize(16);

  pdf.text(

    `Reperibilità Specialisti PLF - ${
      monthNames[currentDate.getMonth()]
    } ${
      currentDate.getFullYear()
    }`,

    148,

    15,

    { align:"center" }

  );



  // DIMENSIONI
  const startX = 15;
  const startY = 28;

  const nameW = 30;
  const cellW = 7;
const headerH = 6;
const cellH = 10;



  const employees = [

    "Dipendente D",
    "Dipendente C",
    "Dipendente B",
    "Dipendente A"

  ];



  const daysInMonth =
    new Date(
      currentDate.getFullYear(),
      currentDate.getMonth()+1,
      0
    ).getDate();



  // HEADER GIORNI
for(let d=1; d<=daysInMonth; d++){

  const x =
    startX + nameW + ((d-1)*cellW);

  const current =
    new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      d
    );

  const dayWeek =
    current.getDay();

let dayLetter = "";

// LUN-MAR-MER-GIO-VEN-SAB-DOM
if(dayWeek === 1) dayLetter = "L";
if(dayWeek === 2) dayLetter = "Ma";
if(dayWeek === 3) dayLetter = "Me";
if(dayWeek === 4) dayLetter = "G";
if(dayWeek === 5) dayLetter = "V";
if(dayWeek === 6) dayLetter = "S";
if(dayWeek === 0) dayLetter = "D";
 

  // ======================
// COLORE HEADER GIORNI
// ======================

// SABATO
if(dayWeek === 6){

  pdf.setFillColor(
    247,
    178,
    103
  );

// DOMENICA
}else if(dayWeek === 0){

  pdf.setFillColor(
    255,
    107,
    107
  );

// GIORNI NORMALI
}else{

  pdf.setFillColor(
    255,
    255,
    255
  );
}



// CELLA HEADER
pdf.rect(
  x,
  startY,
  cellW,
  headerH,
  "FD"
);

// LINEA DIVISORIA
pdf.line(
  x,
  startY + 3,
  x + cellW,
  startY + 3
);

// TESTO NERO
pdf.setTextColor(0,0,0);



// LETTERA GIORNO
pdf.setFontSize(5);

pdf.text(
  dayLetter,
  x + 2,
  startY + 2.2
);



// NUMERO GIORNO
pdf.setFontSize(7);

pdf.text(
  String(d),
  x + 1.6,
  startY + 5.2
);
}



  // RIGHE DIPENDENTI
  employees.forEach((emp,row)=>{

 const y =
  startY + headerH + (row*cellH);


    // NOME
    pdf.setFillColor(255,255,255);

    pdf.rect(
      startX,
      y,
      nameW,
      cellH,
      "FD"
    );

    pdf.setFontSize(7);

    pdf.text(
      emp,
      startX + 2,
      y + 6
    );



    // GIORNI
    for(let d=1; d<=daysInMonth; d++){

      const x =
        startX + nameW + ((d-1)*cellW);



      const date =
        `${currentDate.getFullYear()}-${
          String(
            currentDate.getMonth()+1
          ).padStart(2,"0")
        }-${
          String(d).padStart(2,"0")
        }`;



      const ev =
        savedEvents.find(e =>

          e.employee === emp &&
          e.date === date

        );



     // ======================
// CONTROLLO COPERTURA
// ======================

const hasCoverage =
  savedEvents.some(e =>

    e.date === date &&

    (
      e.shift === "REP" ||
      e.shift === "FREP" ||
      e.shift === "CFI/REP"
    )

  );



// GIORNO SCOPERTO
if(!hasCoverage){

  // VIOLA
  pdf.setFillColor(
    178,
    102,
    255
  );

}

else if(ev){

  // REP
  if(ev.shift === "REP"){

    pdf.setFillColor(
      231,
      193,
      181
    );

  }

  // FREP
  else if(ev.shift === "FREP"){

    pdf.setFillColor(
      216,
      176,
      163
    );

  }

  // CFI
  else if(ev.shift === "CFI"){

    pdf.setFillColor(
      159,
      190,
      114
    );

  }

  // CFI/REP
  else if(ev.shift === "CFI/REP"){

    pdf.setFillColor(
      183,
      207,
      138
    );

  }

  // LIC / REC
  else if(
    ev.shift === "LIC" ||
    ev.shift === "REC"
  ){

    pdf.setFillColor(
      232,
      199,
      107
    );

  }

  else{

    pdf.setFillColor(
      240,
      240,
      240
    );
  }

}else{

  pdf.setFillColor(
    255,
    255,
    255
  );
}
     
      // CELLA
      pdf.rect(
        x,
        y,
        cellW,
        cellH,
        "FD"
      );



      // TESTO
      if(ev){

        pdf.setFontSize(5);

        pdf.text(
          ev.shift,
          x + 0.8,
          y + 6
        );
      }
    }
  });



  // DOWNLOAD
  pdf.save(

    `Reperibilita_${
      monthNames[currentDate.getMonth()]
    }_${
      currentDate.getFullYear()
    }.pdf`

  );
}
// ======================
// LOAD REQUESTS
// ======================
function loadRequests() {

  if (!window.firebaseFirestore || !window.db) return;

  window.firebaseFirestore.onSnapshot(
    window.firebaseFirestore.collection(window.db, "changeRequests"),
    (snapshot) => {

      const container = document.getElementById("requestsList");
      if (!container) return;

      container.innerHTML = "";

      let unreadCount = 0;

      snapshot.forEach(docSnap => {

        const req = docSnap.data();
        const id = docSnap.id;

        if (req.read === false) unreadCount++;

        const statusClass =
          req.status === "ACCEPTED" ? "status-accepted" :
          req.status === "REJECTED" ? "status-rejected" :
          "status-pending";

        const disabled = req.status !== "PENDING";

        const div = document.createElement("div");
        div.classList.add("request-card", statusClass);

        div.innerHTML = `
          <div class="request-title">
            ${req.fromEmployee} ➜ ${req.toEmployee}
          </div>

          <div class="request-dates">
            ${req.fromDate} ⇄ ${req.toDate}
          </div>

          <div class="request-status">
            Stato: ${req.status}
          </div>

          <div class="request-actions">

            <button class="btn-accept"
              ${disabled ? "disabled" : ""}
              onclick="handleChangeRequest('${id}','ACCEPT')">
              Accetta
            </button>

            <button class="btn-reject"
              ${disabled ? "disabled" : ""}
              onclick="handleChangeRequest('${id}','REJECT')">
              Rifiuta
            </button>

          </div>
        `;

        container.appendChild(div);
      });

      // 🔔 BADGE
      const badge = document.getElementById("notifBadge");
      if (badge) {
        badge.textContent = unreadCount > 0 ? unreadCount : "";
      }
    }
  );
}
//=====================
// ACCETTA / RIFIUTA CAMBIO
// ======================
window.handleChangeRequest = async function(requestId, action) {

  // 🔥 DEBUG: verifica click
  console.log("CLICK FUNZIONA", requestId, action);

  const reqRef = window.firebaseFirestore.doc(
    window.db,
    "changeRequests",
    requestId
  );

  const reqSnap = await window.firebaseFirestore.getDoc(reqRef);
  const req = reqSnap.data();

  if (!req || req.status !== "PENDING") return;

  // ======================
  // RIFIUTA
  // ======================
  if (action === "REJECT") {

    await window.firebaseFirestore.updateDoc(reqRef, {
      status: "REJECTED"
    });

    await window.firebaseFirestore.addDoc(
      window.firebaseFirestore.collection(window.db, "notifications"),
      {
        to: req.fromEmployee,
        message: "❌ Cambio turno rifiutato",
        type: "error",
        read: false,
        createdAt: Date.now()
      }
    );

    return;
  }

  // ======================
  // ACCETTA
  // ======================
  if (action === "ACCEPT") {

    await window.firebaseFirestore.updateDoc(reqRef, {
      status: "ACCEPTED"
    });

    const eventA = savedEvents.find(e =>
      e.employee === req.fromEmployee &&
      e.date === req.fromDate
    );

    const eventB = savedEvents.find(e =>
      e.employee === req.toEmployee &&
      e.date === req.toDate
    );

    if (eventA && eventB) {

      await window.firebaseFirestore.updateDoc(
        window.firebaseFirestore.doc(window.db, "events", eventA.firebaseId),
        { employee: req.toEmployee }
      );

      await window.firebaseFirestore.updateDoc(
        window.firebaseFirestore.doc(window.db, "events", eventB.firebaseId),
        { employee: req.fromEmployee }
      );
    }

    await window.firebaseFirestore.addDoc(
      window.firebaseFirestore.collection(window.db, "notifications"),
      {
        to: req.fromEmployee,
        message: "✅ Cambio accettato",
        type: "success",
        read: false,
        createdAt: Date.now()
      }
    );
  }
};
  // ======================
  // RIFIUTA
  // ======================
  if (action === "REJECT") {

    await window.firebaseFirestore.updateDoc(reqRef, {
      status: "REJECTED",
      read: true
    });

    // notifica
    await window.firebaseFirestore.addDoc(
      window.firebaseFirestore.collection(window.db, "notifications"),
      {
        to: req.fromEmployee,
        message: "❌ Cambio turno rifiutato",
        type: "error",
        read: false,
        createdAt: Date.now()
      }
    );
  }
};
