importScripts("https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js");

/* ======================
   FIREBASE INIT
====================== */

firebase.initializeApp({
  apiKey: "AIzaSyBCKQp_DA2Bjbs6g27Wwl8eo_kyzzI2A40",
  authDomain: "calendario-rep.firebaseapp.com",
  projectId: "calendario-rep",
  storageBucket: "calendario-rep.firebasestorage.app",
  messagingSenderId: "1067128179274",
  appId: "1:1067128179274:web:e1c7174c25bdabee2ff4b3"
});

const messaging = firebase.messaging();


/* ======================
   CONTATORE BADGE
====================== */

let badgeCount = 0;



self.addEventListener("push", event => {

  console.log("🔥 PUSH RAW ARRIVATO", event);

});



/* ====================
   NOTIFICHE BACKGROUND
====================== */

messaging.onBackgroundMessage((payload) => {


console.log("📩 Background message ricevuto:", payload);

badgeCount = (badgeCount || 0) + 1;

// 🔴 NUMERETTO ICONA APP
if (self.navigator && "setAppBadge" in self.navigator) {
  self.navigator.setAppBadge(badgeCount);
}
 const notification = payload.notification || {};
const data = payload.data || {};

const title =
  notification.title ||
  payload.data?.title ||
  "Planner REP";

const body =
  notification.body ||
  payload.data?.body ||
  "";



 self.registration.showNotification(
  title,
  {

    body: body,

    icon: "/icon-192.png",

    badge: "/icon-192.png",

    data: data,   // 👈 QUESTO è giusto

    vibrate: [
      200,
      100,
      200
    ],

    actions:[
        {
          action:"open",
          title:"Apri"
        }
      ]

    }

  );


});





/* ======================
   CLICK NOTIFICA
====================== */

self.addEventListener(
"notificationclick",
(event)=>{


console.log(
"🔔 NOTIFICA CLICCATA:",
event
);



event.notification.close();



const data =
event.notification.data || {};



const requestId =
data.requestId || "";



event.waitUntil(


clients.matchAll({

type:"window",

includeUncontrolled:true

})


.then((clientList)=>{



for(
const client of clientList
){


if(
client.url.includes("index.html")
&&
"focus" in client
){


client.focus();



client.postMessage({

type:"OPEN_REQUEST",

requestId:requestId

});



return;

}


}





if(
clients.openWindow
){


return clients.openWindow(

"/index.html?requestId="
+
requestId

);


}



})


);



});
