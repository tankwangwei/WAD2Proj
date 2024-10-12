// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAb7M3MiQ3tGYMT1PCFRam-Z0S6rXqwVcQ",
  authDomain: "wad2-32757.firebaseapp.com",
  projectId: "wad2-32757",
  storageBucket: "wad2-32757.appspot.com",
  messagingSenderId: "191549341083",
  appId: "1:191549341083:web:ad67ea6030d29c8700353e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app)

//inputs
const email = document.getElementById("email").value
const password = document.getElementById("password").value

//submit button
const submit = document.getElementById("submit")
submit.addEventListener("click", function (event) {
  event.preventDefault()

  const email = document.getElementById("email").value
  const password = document.getElementById("password").value

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed up 
      const user = userCredential.user;
      window.location.href = "login.html"
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
    });
})