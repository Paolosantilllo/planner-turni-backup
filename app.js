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

 document.getElementById("startDate").value =
  formattedDate;

document.getElementById("endDate").value =
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

if(event.employee === "PERCACCIOLI"){
  eventDiv.classList.add("percaccioli");
}

if(event.employee === "MANUNTA"){
  eventDiv.classList.add("manunta");
}

if(event.employee === "SANTILLO"){
  eventDiv.classList.add("santillo");
}
# Modifiche per REP e FREP

Queste modifiche aggiungono:

* REP solo nei giorni feriali
* massimo 6 REP al mese per dipendente
* FREP solo nei giorni festivi
* massimo 2 FREP al mese per dipendente
* FREP scritto in rosso

---

# 1. AGGIUNGI QUESTE FUNZIONI SOPRA `saveShift()`

```javascript
function isHoliday(date){

  const day = date.getDay();

  // Domenica
  if(day === 0){
    return true;
  }

  const month = date.getMonth() + 1;
  const dayNumber = date.getDate();

  const holidays = [
    "1-1",   // Capodanno
    "6-1",   // Epifania
    "25-4",  // Liberazione
    "1-5",   // Festa del lavoro
    "2-6",   // Repubblica
    "15-8",  // Ferragosto
    "1-11",  // Ognissanti
    "8-12",  // Immacolata
    "25-12", // Natale
    "26-12"  // Santo Stefano
  ];

  return holidays.includes(
    `${dayNumber}-${month}`
  );

}

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
```

---

# 2. DENTRO `saveShift()`

Trova questo blocco:

```javascript
while(current <= end){
```

E sostituisci tutto il contenuto del ciclo con questo:

```javascript
while(current <= end){

  const currentDate = new Date(current);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // REP
  if(shift === "REP"){

    if(isHoliday(currentDate)){

      alert(
        "REP può essere inserito solo nei giorni feriali"
      );

      return;

    }

    const repCount = countMonthlyShift(
      employee,
      "REP",
      year,
      month
    );

    if(repCount >= 6){

      alert(
        employee + " ha già 6 REP questo mese"
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

    const frepCount = countMonthlyShift(
      employee,
      "FREP",
      year,
      month
    );

    if(frepCount >= 2){

      alert(
        employee + " ha già 2 FREP questo mese"
      );

      return;

    }

  }

  savedEvents.push({

    employee,

    date:
      currentDate.toISOString().split("T")[0],

    shift

  });

  current.setDate(
    current.getDate() + 1
  );

}
```

---

# 3. FREP IN ROSSO

Dentro questa parte:

```javascript
if(event.employee === "PERCACCIOLI"){
  eventDiv.classList.add("percaccioli");
}
```

aggiungi subito sotto:

```javascript
if(event.shift === "FREP"){
  eventDiv.classList.add("frep");
}
```

---

# 4. CSS

Aggiungi in fondo al CSS:

```css
.frep{
  background:#ff3b30 !important;
}
```

---

# RISULTATO

Ora il sistema:

✅ blocca REP nei festivi
✅ massimo 6 REP al mese
✅ blocca FREP nei feriali
✅ massimo 2 FREP al mese
✅ FREP rosso
✅ controlla automaticamente tutte le date dell'intervallo

Esempio:

* REP dal 1 al 7 giugno
  → se dentro c’è una domenica il sistema lo blocca.

* FREP il martedì
  → viene bloccato.

* terzo FREP del mese
  → viene bloccato automaticamente.

eventDiv.innerHTML = `
  <div class="event-name">
    ${event.employee}
  </div>

  <div class="event-shift">
    ${event.shift}
  </div>
`;
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
# Modifiche per REP e FREP

Queste modifiche aggiungono:

* REP solo nei giorni feriali
* massimo 6 REP al mese per dipendente
* FREP solo nei giorni festivi
* massimo 2 FREP al mese per dipendente
* FREP scritto in rosso

---

# 1. AGGIUNGI QUESTE FUNZIONI SOPRA `saveShift()`

```javascript
function isHoliday(date){

  const day = date.getDay();

  // Domenica
  if(day === 0){
    return true;
  }

  const month = date.getMonth() + 1;
  const dayNumber = date.getDate();

  const holidays = [
    "1-1",   // Capodanno
    "6-1",   // Epifania
    "25-4",  // Liberazione
    "1-5",   // Festa del lavoro
    "2-6",   // Repubblica
    "15-8",  // Ferragosto
    "1-11",  // Ognissanti
    "8-12",  // Immacolata
    "25-12", // Natale
    "26-12"  // Santo Stefano
  ];

  return holidays.includes(
    `${dayNumber}-${month}`
  );

}

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
```

---

# 2. DENTRO `saveShift()`

Trova questo blocco:

```javascript
while(current <= end){
```

E sostituisci tutto il contenuto del ciclo con questo:

```javascript
while(current <= end){

  const currentDate = new Date(current);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // REP
  if(shift === "REP"){

    if(isHoliday(currentDate)){

      alert(
        "REP può essere inserito solo nei giorni feriali"
      );

      return;

    }

    const repCount = countMonthlyShift(
      employee,
      "REP",
      year,
      month
    );

    if(repCount >= 6){

      alert(
        employee + " ha già 6 REP questo mese"
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

    const frepCount = countMonthlyShift(
      employee,
      "FREP",
      year,
      month
    );

    if(frepCount >= 2){

      alert(
        employee + " ha già 2 FREP questo mese"
      );

      return;

    }

  }

  savedEvents.push({

    employee,

    date:
      currentDate.toISOString().split("T")[0],

    shift

  });

  current.setDate(
    current.getDate() + 1
  );

}
```

---

# 3. FREP IN ROSSO

Dentro questa parte:

```javascript
if(event.employee === "PERCACCIOLI"){
  eventDiv.classList.add("percaccioli");
}
```

aggiungi subito sotto:

```javascript
if(event.shift === "FREP"){
  eventDiv.classList.add("frep");
}
```

---

# 4. CSS

Aggiungi in fondo al CSS:

```css
.frep{
  background:#ff3b30 !important;
}
```

---

# RISULTATO

Ora il sistema:

✅ blocca REP nei festivi
✅ massimo 6 REP al mese
✅ blocca FREP nei feriali
✅ massimo 2 FREP al mese
✅ FREP rosso
✅ controlla automaticamente tutte le date dell'intervallo

Esempio:

* REP dal 1 al 7 giugno
  → se dentro c’è una domenica il sistema lo blocca.

* FREP il martedì
  → viene bloccato.

* terzo FREP del mese
  → viene bloccato automaticamente.

function saveShift() {

  const employee =
    document.getElementById("employee").value;

  const date =
    document.getElementById("date").value;

  const shift =
    document.getElementById("shift").value;

 if(!startDate || !endDate) {
    alert("Seleziona una data");
    return;
  }

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

 # Modifiche per REP e FREP

Queste modifiche aggiungono:

* REP solo nei giorni feriali
* massimo 6 REP al mese per dipendente
* FREP solo nei giorni festivi
* massimo 2 FREP al mese per dipendente
* FREP scritto in rosso

---

# 1. AGGIUNGI QUESTE FUNZIONI SOPRA `saveShift()`

```javascript
function isHoliday(date){

  const day = date.getDay();

  // Domenica
  if(day === 0){
    return true;
  }

  const month = date.getMonth() + 1;
  const dayNumber = date.getDate();

  const holidays = [
    "1-1",   // Capodanno
    "6-1",   // Epifania
    "25-4",  // Liberazione
    "1-5",   // Festa del lavoro
    "2-6",   // Repubblica
    "15-8",  // Ferragosto
    "1-11",  // Ognissanti
    "8-12",  // Immacolata
    "25-12", // Natale
    "26-12"  // Santo Stefano
  ];

  return holidays.includes(
    `${dayNumber}-${month}`
  );

}

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
```

---

# 2. DENTRO `saveShift()`

Trova questo blocco:

```javascript
while(current <= end){
```

E sostituisci tutto il contenuto del ciclo con questo:

```javascript
while(current <= end){

  const currentDate = new Date(current);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // REP
  if(shift === "REP"){

    if(isHoliday(currentDate)){

      alert(
        "REP può essere inserito solo nei giorni feriali"
      );

      return;

    }

    const repCount = countMonthlyShift(
      employee,
      "REP",
      year,
      month
    );

    if(repCount >= 6){

      alert(
        employee + " ha già 6 REP questo mese"
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

    const frepCount = countMonthlyShift(
      employee,
      "FREP",
      year,
      month
    );

    if(frepCount >= 2){

      alert(
        employee + " ha già 2 FREP questo mese"
      );

      return;

    }

  }

  savedEvents.push({

    employee,

    date:
      currentDate.toISOString().split("T")[0],

    shift

  });

  current.setDate(
    current.getDate() + 1
  );

}
```

---

# 3. FREP IN ROSSO

Dentro questa parte:

```javascript
if(event.employee === "PERCACCIOLI"){
  eventDiv.classList.add("percaccioli");
}
```

aggiungi subito sotto:

```javascript
if(event.shift === "FREP"){
  eventDiv.classList.add("frep");
}
```

---

# 4. CSS

Aggiungi in fondo al CSS:

```css
.frep{
  background:#ff3b30 !important;
}
```

---

# RISULTATO

Ora il sistema:

✅ blocca REP nei festivi
✅ massimo 6 REP al mese
✅ blocca FREP nei feriali
✅ massimo 2 FREP al mese
✅ FREP rosso
✅ controlla automaticamente tutte le date dell'intervallo

Esempio:

* REP dal 1 al 7 giugno
  → se dentro c’è una domenica il sistema lo blocca.

* FREP il martedì
  → viene bloccato.

* terzo FREP del mese
  → viene bloccato automaticamente.


}

  localStorage.setItem(
    "events",
    JSON.stringify(savedEvents)
  );

  closePopup();

  renderCalendar();

}
