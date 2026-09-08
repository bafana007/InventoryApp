/* Firebase initialization for the inventory app. */
(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyBGQ_RtwRj8kvDCV0D9BqHJrb49PsyGuj8",
    authDomain: "inventory-f16ff.firebaseapp.com",
    databaseURL: "https://inventory-f16ff-default-rtdb.firebaseio.com",
    projectId: "inventory-f16ff",
    storageBucket: "inventory-f16ff.firebasestorage.app",
    messagingSenderId: "999595425243",
    appId: "1:999595425243:web:e61c6c64f0384fd8023bfe",
    measurementId: "G-ZN0JBBVDN2",
  };

  firebase.initializeApp(firebaseConfig);
  if (firebase.analytics) {
    firebase.analytics();
  }

  window.DB = {
    ref: firebase.database().ref("inventory"),
    sync: function (data) {
      return window.DB.ref.set(data);
    },
  };
})();
