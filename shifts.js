
/* ======================
   SHIFT RULES ENGINE
====================== */

import { db, firestore } from "./firebase.js";

/* ======================
   FESTIVI
====================== */

const holidays = [
  "1-1","6-1","25-4","1-5","2-6",
  "15-8","1-11","8-12","25-12","26-12"
];

/* ======================
   CHECK FESTIVO
====================== */

export function isFestive(dateObj){

  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1;
  const weekDay = dateObj.getDay();

  const holiday = holidays.includes(`${day}-${month}`);

  return weekDay === 0 || holiday;
}

/* ======================
   CONTEGGI MENSILI
====================== */

function countShift(events, employee, shift, month, year){

  return events.filter(ev => {

    const sameEmployee = ev.employee === employee;

    const parts = ev.date.split("-");
    const evYear = Number(parts[0]);
    const evMonth = Number(parts[1]) - 1;

    return (
      sameEmployee &&
      ev.shift === shift &&
      evMonth === month &&
      evYear === year
    );

  }).length;

}

/* ======================
   VALIDAZIONE PRINCIPALE
====================== */

export function validateShift(events, employee, date, shift){

  const d = new Date(date);

  const month = d.getMonth();
  const year = d.getFullYear();

  const festive = isFestive(d);

  let finalShift = shift;

  // AUTO FREP
  if(shift === "REP"){
    finalShift = festive ? "FREP" : "REP";
  }

  // REP LIMIT
  if(finalShift === "REP"){

    const count = countShift(events, employee, "REP", month, year);

    if(count >= 6){
      return { ok:false, message:"Max 6 REP al mese" };
    }

  }

  // FREP LIMIT
  if(finalShift === "FREP"){

    if(!festive){
      return { ok:false, message:"FREP solo festivi" };
    }

    const count = countShift(events, employee, "FREP", month, year);

    if(count >= 2){
      return { ok:false, message:"Max 2 FREP al mese" };
    }

  }

  return { ok:true, finalShift };

}
