
const grid = document.getElementById('calendarGrid');

function createCalendar() {
  for(let i=1;i<=31;i++){

    const day = document.createElement('div');
    day.classList.add('day');

    const date = new Date(2026,4,i);
    const weekday = date.getDay();

    if(weekday === 6){
      day.classList.add('saturday');
    }

    if(weekday === 0){
      day.classList.add('sunday');
    }

    day.innerHTML = `
      <div class="day-number">${i}</div>
      <div class="event rep">Rep</div>
      <div class="event cfi">CFI</div>
    `;

    grid.appendChild(day);
  }
}

createCalendar();

function applyShift(){
  const employee = document.getElementById('employee').value;
  const shift = document.getElementById('shiftType').value;

  if(!shift){
    alert("Seleziona un turno");
    return;
  }

  alert(`Turno ${shift} applicato a ${employee}`);
}

/*
REGOLE DA IMPLEMENTARE:

- REP massimo 6
- FREP massimo 2
- FREP solo domenica/festivi
- REP vietato festivi/domenica
- Conteggio CFI weekend doppio
- Vista annuale
- Vista settimanale
- Database salvataggio

*/
