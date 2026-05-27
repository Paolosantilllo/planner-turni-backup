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
function loadEventsFromFirebase(){

  if(!window.firebaseFirestore || !window.db) return;

  window.firebaseFirestore.onSnapshot(
    window.firebaseFirestore.collection(window.db,"events"),
    (snapshot)=>{

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
function renderCalendar(){

  calendar.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthTitle.innerText =
    monthNames[month] + " " + year;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let startDay = firstDay - 1;
  if(startDay < 0) startDay = 6;



  for(let i=0;i<startDay;i++){
    const empty = document.createElement("div");
    empty.classList.add("empty-day");
    calendar.appendChild(empty);
  }



  for(let day=1; day<=daysInMonth; day++){

    const dayBox = document.createElement("div");
    dayBox.classList.add("day");

    const date = new Date(year, month, day);
    const formatted = date.toISOString().split("T")[0];



    // CLICK DAY
    dayBox.addEventListener("click",()=>{

      editingIndex = null;

      openPopup();

      document.getElementById("startDate").value = formatted;
      document.getElementById("endDate").value = formatted;

    });



    // NUMBER
    const num = document.createElement("div");
    num.classList.add("day-number");
    num.innerText = day;
    dayBox.appendChild(num);



    // EVENTS
    const selectedEmployee =
      document.getElementById("employeeFilter").value;

    const events = savedEvents.filter(e =>
      e.date === formatted &&
      (selectedEmployee === "ALL" || e.employee === selectedEmployee)
    );



    events.forEach(event => {

      const div = document.createElement("div");
      div.classList.add("event");

      if(event.employee === "Dipendente D") div.classList.add("dipendente-d");
      if(event.employee === "Dipendente C") div.classList.add("dipendente-c");
      if(event.employee === "Dipendente B") div.classList.add("dipendente-b");
      if(event.employee === "Dipendente A") div.classList.add("dipendente-a");

      div.innerHTML = `<div class="event-shift">${event.shift}</div>`;



      div.addEventListener("click",(e)=>{
        e.stopPropagation();

        editingIndex = savedEvents.indexOf(event);

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
// CAMBIO TURNO (NUOVO SISTEMA)
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



  changeDate.innerHTML = "";
  changeToDate.innerHTML = "";



  const validShifts = ["REP","FREP","CFI/REP"];



  const fromDays = savedEvents.filter(ev =>
    ev.employee === fromEmployee &&
    validShifts.includes(ev.shift)
  );



  const toDays = savedEvents.filter(ev =>
    ev.employee === toEmployee &&
    validShifts.includes(ev.shift)
  );



  fromDays.forEach(ev => {
    const opt = document.createElement("option");
    opt.value = ev.date;
    opt.textContent = `${ev.date} - ${ev.shift}`;
    changeDate.appendChild(opt);
  });



  toDays.forEach(ev => {
    const opt = document.createElement("option");
    opt.value = ev.date;
    opt.textContent = `${ev.date} - ${ev.shift}`;
    changeToDate.appendChild(opt);
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



// ======================
// CAMBIO POPUP
// ======================
function openChangePopup(){
  document.getElementById("changePopup").style.display = "flex";
  loadChangeDays();
}

function closeChangePopup(){
  document.getElementById("changePopup").style.display = "none";
}



// ======================
// SAVE SHIFT
// ======================
async function saveShift(){

  const employee = document.getElementById("employee").value;
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;
  const shift = document.getElementById("shift").value;

  let current = new Date(start);
  let stop = new Date(end);

  while(current <= stop){

    const date = current.toISOString().split("T")[0];

    await window.firebaseFirestore.addDoc(
      window.firebaseFirestore.collection(window.db,"events"),
      { employee, date, shift }
    );

    current.setDate(current.getDate()+1);
  }

  closePopup();
}



// ======================
// DELETE SHIFT
// ======================
async function deleteShift(){

  if(editingIndex === null) return;

  const ev = savedEvents[editingIndex];

  if(ev.firebaseId){

    await window.firebaseFirestore.deleteDoc(
      window.firebaseFirestore.doc(window.db,"events",ev.firebaseId)
    );

  }

  closePopup();
}



// ======================
// CAMBIO TURNO
// ======================
async function sendChangeRequest(){

  const fromEmployee = document.getElementById("changeFrom").value;
  const toEmployee = document.getElementById("changeTo").value;

  const fromDate = document.getElementById("changeDate").value;
  const toDate = document.getElementById("changeToDate").value;

  const shift = document.getElementById("changeShift").value;



  const eventA = savedEvents.find(e =>
    e.employee === fromEmployee &&
    e.date === fromDate &&
    e.shift === shift
  );

  const eventB = savedEvents.find(e =>
    e.employee === toEmployee &&
    e.date === toDate &&
    e.shift === shift
  );



  if(!eventA || !eventB){
    alert("Turni non trovati");
    return;
  }



  await window.firebaseFirestore.updateDoc(
    window.firebaseFirestore.doc(window.db,"events",eventA.firebaseId),
    { employee: toEmployee }
  );



  await window.firebaseFirestore.updateDoc(
    window.firebaseFirestore.doc(window.db,"events",eventB.firebaseId),
    { employee: fromEmployee }
  );



  alert("Cambio effettuato");
  closeChangePopup();
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
// INIT
// ======================
window.addEventListener("load",()=>{
  setTimeout(()=>{
    loadEventsFromFirebase();
    renderCalendar();
  },500);
});
