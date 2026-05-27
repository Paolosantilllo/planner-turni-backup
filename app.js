const calendar = document.getElementById("calendar");
const monthTitle = document.getElementById("monthTitle");
const popup = document.getElementById("popup");
const CURRENT_USER = {
  name: "SANTILLO",
  role: "admin"
};
let currentDate = new Date();

const monthNames = [
  "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
  "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"
];

let savedEvents = [];

let editingIndex = null;
let selectingChangeFrom = false;
let selectingChangeTo = false;


// ======================
// FIREBASE
// ======================
function loadEventsFromFirebase(){

  console.log("Firebase partito");

  if(!window.firebaseFirestore){
    console.log("firebaseFirestore NON trovato");
    return;
  }

  if(!window.db){
    console.log("db NON trovato");
    return;
  }

  window.firebaseFirestore.onSnapshot(

    window.firebaseFirestore.collection(window.db,"events"),

    (snapshot)=>{

      console.log("Snapshot ricevuto");

      savedEvents = [];

      snapshot.forEach((docSnap)=>{

        console.log(docSnap.data());

        const data = docSnap.data();

        savedEvents.push({
          firebaseId: docSnap.id,
          employee: data.employee,
          date: data.date,
          shift: data.shift
        });

      });

      console.log("Eventi caricati:", savedEvents);

      renderCalendar();
    },

    (error)=>{

      console.log("ERRORE FIREBASE:");
      console.log(error);

    }
  );
}

// ======================
// FESTIVI
// ======================
function isHoliday(date){

  const day = date.getDay();

  if(day === 0) return true;

  const month = date.getMonth()+1;

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
// CALENDARIO
// ======================
function renderCalendar(){

  console.log("renderCalendar partito");
  console.log("EVENTI IN MEMORIA:", savedEvents);
  
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

    const loopDate =
      new Date(year, month, day);



    if(isHoliday(loopDate)){
      dayBox.classList.add("holiday-day");
    }



    // click giorno
    dayBox.addEventListener("click",()=>{

      editingIndex = null;

      openPopup();

      const y = loopDate.getFullYear();

      const m =
        String(loopDate.getMonth()+1).padStart(2,"0");

      const d =
        String(loopDate.getDate()).padStart(2,"0");

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

    (
      selectedEmployee === "ALL" ||
      event.employee === selectedEmployee
    )

  );

});

    events.forEach(event => {

      const eventIndex =
        savedEvents.indexOf(event);

      const eventDiv =
        document.createElement("div");

      eventDiv.classList.add("event");

     if(event.employee === "Dipendente D")
        eventDiv.classList.add("dipendente-d");


      if(event.employee === "Dipendente C")
        eventDiv.classList.add("dipendente-c");

      if(event.employee === "Dipendente B")
        eventDiv.classList.add("dipendente-b");

      if(event.employee === "Dipendente A")
        eventDiv.classList.add("dipendente-a");



      eventDiv.innerHTML = `
        <div class="event-shift ${event.shift === "FREP" ? "frep-text" : ""}">
          ${event.shift}
        </div>
      `;



      // modifica
      eventDiv.addEventListener("click",(e)=>{

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

  // aggiorna highlight cambio turno
  highlightChangeDays();

}

// ======================
// CARICA GIORNI CAMBIO (NUOVO SISTEMA)
// ======================
function loadChangeDays(){

  const fromEmployee =
    document.getElementById("changeFrom").value;

  const toEmployee =
    document.getElementById("changeTo").value;

  const changeDate =
    document.getElementById("changeDate");

  const changeToDate =
    document.getElementById("changeToDate");



  // reset select
  changeDate.innerHTML = "";
  changeToDate.innerHTML = "";



  // FILTRA SOLO TURNI VALIDI
  const validShifts = ["REP", "FREP", "CFI/REP"];



  // ======================
  // GIORNI DIPENDENTE FROM
  // ======================
  const fromDays =
    savedEvents.filter(ev =>
      ev.employee === fromEmployee &&
      validShifts.includes(ev.shift)
    );



  fromDays.forEach(ev => {

    const option =
      document.createElement("option");

    option.value = ev.date;
    option.textContent = `${ev.date} - ${ev.shift}`;

    changeDate.appendChild(option);

  });



  // ======================
  // GIORNI DIPENDENTE TO
  // ======================
  const toDays =
    savedEvents.filter(ev =>
      ev.employee === toEmployee &&
      validShifts.includes(ev.shift)
    );



  toDays.forEach(ev => {

    const option =
      document.createElement("option");

    option.value = ev.date;
    option.textContent = `${ev.date} - ${ev.shift}`;

    changeToDate.appendChild(option);

  });

}
// ======================
// POPUP
// ======================
function openPopup(){
  popup.style.display = "flex";
}

function closePopup(){
  popup.style.display = "none";
}

function openChangePopup(){
  document.getElementById("changePopup").style.display = "flex";
}

function closeChangePopup(){
  document.getElementById("changePopup").style.display = "none";
}



// ======================
// SALVA
// ======================
async function saveShift(){

  if(CURRENT_USER.role !== "admin"){
  alert("Non hai permessi per inserire turni");
  return;
}
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

  let current = new Date(startDate);
  let end = new Date(endDate);

  while(current <= end){

    const d = new Date(current);

    const day = d.getDay(); // 0 = domenica
    const month = d.getMonth() + 1;
    const dayNumber = d.getDate();

    const isSunday = day === 0;

    const holidays = [
      "1-1","6-1","25-4","1-5","2-6",
      "15-8","1-11","8-12","25-12","26-12"
    ];

    const isHoliday = holidays.includes(`${dayNumber}-${month}`);

    const isFestive = isSunday || isHoliday;


    // =========================
    // 1. BLOCCO REP
    // =========================
    if(shift === "REP"){

      if(isSunday){
        alert("REP non valido la domenica");
        return;
      }

      const repCount =
        countMonthlyShift(employee,"REP",d.getFullYear(),d.getMonth());

      if(repCount >= 6){
        alert("Massimo 6 REP");
        return;
      }
    }



    // =========================
    // 2. BLOCCO FREP
    // =========================
    if(shift === "FREP"){

      if(!isFestive){
        alert("FREP solo domenica e festivi");
        return;
      }

      const frepCount =
        countMonthlyShift(employee,"FREP",d.getFullYear(),d.getMonth());

      if(frepCount >= 2){
        alert("Massimo 2 FREP");
        return;
      }
    }



    // =========================
    // 3. BLOCCO DUPLICATI STESSO GIORNO
    // =========================
    const sameDayEvents = savedEvents.filter(ev => ev.date === d.toISOString().split("T")[0]);

    const hasRep =
  sameDayEvents.some(ev => ev.shift === "REP");

const hasFrep =
  sameDayEvents.some(ev => ev.shift === "FREP");



// blocco REP
if(shift === "REP"){

  if(hasRep){
    alert("Esiste già un REP in questo giorno");
    return;
  }

  if(hasFrep){
    alert("Esiste già un FREP in questo giorno");
    return;
  }
}



// blocco FREP
if(shift === "FREP"){

  if(hasFrep){
    alert("Esiste già un FREP in questo giorno");
    return;
  }

  if(hasRep){
    alert("Esiste già un REP in questo giorno");
    return;
  }
}



    // =========================
    // SALVATAGGIO
    // =========================
    const newEvent = {
      employee,
      date: d.toISOString().split("T")[0],
      shift
    };

    await window.firebaseFirestore.addDoc(
      window.firebaseFirestore.collection(window.db,"events"),
      newEvent
    );

    current.setDate(current.getDate()+1);
  }

  editingIndex = null;
  closePopup();
}

// ======================
// CAMBIO TURNO
// ======================
async function sendChangeRequest(){

  const fromEmployee =
    document.getElementById("changeFrom").value;

  const toEmployee =
    document.getElementById("changeTo").value;

  const fromDate =
    document.getElementById("changeDate").value;

  const toDate =
    document.getElementById("changeToDate").value;

  const shift =
    document.getElementById("changeShift").value;



  // evento A
  const eventA = savedEvents.find(ev =>

    ev.employee === fromEmployee &&
    ev.date === fromDate &&
    ev.shift === shift

  );



  // evento B
  const eventB = savedEvents.find(ev =>

    ev.employee === toEmployee &&
    ev.date === toDate &&
    ev.shift === shift

  );



  if(!eventA){

    alert(fromEmployee + " non ha questo turno");

    return;
  }



  if(!eventB){

    alert(toEmployee + " non ha questo turno");

    return;
  }



  // SCAMBIO REALE
  await window.firebaseFirestore.updateDoc(

    window.firebaseFirestore.doc(
      window.db,
      "events",
      eventA.firebaseId
    ),

    {
      employee: toEmployee
    }

  );



  await window.firebaseFirestore.updateDoc(

    window.firebaseFirestore.doc(
      window.db,
      "events",
      eventB.firebaseId
    ),

    {
      employee: fromEmployee
    }

  );



  alert("Cambio reperibilità effettuato");

  closeChangePopup();
}



// ======================
// DELETE
// ======================
async function deleteShift(){

  if(CURRENT_USER.role !== "admin"){
  alert("Non hai permessi per eliminare turni");
  return;
}
  if(editingIndex === null) return;

  const event = savedEvents[editingIndex];



  if(event.firebaseId){

    await window.firebaseFirestore.deleteDoc(

      window.firebaseFirestore.doc(
        window.db,
        "events",
        event.firebaseId
      )
    );
  }



  editingIndex = null;

  closePopup();
}



// ======================
// NAV
// ======================
function nextMonth(){

  currentDate.setMonth(
    currentDate.getMonth()+1
  );

  renderCalendar();
}

function prevMonth(){

  currentDate.setMonth(
    currentDate.getMonth()-1
  );

  renderCalendar();
}



// ======================
// START
// ======================
window.addEventListener("load", () => {

  setTimeout(() => {

    loadEventsFromFirebase();

    renderCalendar();

  }, 800);

});
window.addEventListener("focus", () => {
  renderCalendar();
});

window.addEventListener("pageshow", () => {
  renderCalendar();
});
