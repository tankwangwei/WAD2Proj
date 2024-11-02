// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

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
const auth = getAuth(app);

// Function to validate email format
function validateEmail(email) {
  const re = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  return re.test(String(email).toLowerCase());
}

// Function to validate password (minimum 6 characters)
function validatePassword(password) {
  return password.length >= 6;
}

// Ensure DOM is ready before attaching event listeners
document.addEventListener("DOMContentLoaded", function() {
  // Get the submit button and error message container
  const submit = document.getElementById("submit");
  const errorMessageDisplay = document.getElementById("error-message");

  // Make sure these elements exist before continuing
  if (!submit || !errorMessageDisplay) {
    console.error("Error: Submit button or error message container not found.");
    return;
  }


  // Submit button event listener
  submit.addEventListener("click", function(event) {
    event.preventDefault();

    // Get inputs inside the event listener to ensure they are the latest values entered by the user
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    errorMessageDisplay.innerText = ""; // Clear previous error message

    if (!validateEmail(email)) {
      errorMessageDisplay.innerText = "Invalid email format.";
      return;
    }

    if (!validatePassword(password)) {
      errorMessageDisplay.innerText = "Password must be at least 6 characters.";
      return;
    }

    // If validation passes, create the account with Firebase
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Signed up successfully
        const user = userCredential.user;
        localStorage.setItem("userUID", user.uid); // Store user UID
        window.location.href = "login.html"; // Redirect to login page
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;

        // Firebase-specific error handling for registration
        if (errorCode === 'auth/email-already-in-use') {
          errorMessageDisplay.innerText = "This email is already in use. Please use a different one.";
        } else if (errorCode === 'auth/invalid-email') {
          errorMessageDisplay.innerText = "Invalid email format.";
        } else if (errorCode === 'auth/weak-password') {
          errorMessageDisplay.innerText = "Weak password. Please provide a stronger password.";
        } else {
          errorMessageDisplay.innerText = errorMessage;
        }
      });
  });
});
