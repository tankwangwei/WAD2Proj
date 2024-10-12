// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

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

// Function to validate email format using regex
function validateEmail(email) {
    const re = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    return re.test(String(email).toLowerCase());
}

// Function to validate password (you can modify this according to your password requirements)
function validatePassword(password) {
    return password.length >= 6;
}

//submit button
const login = document.getElementById("login");
login.addEventListener("click", function (event) {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    // Clear previous error messages
    const errorMessageDisplay = document.getElementById("error-message");
    errorMessageDisplay.textContent = "";

    if (!validateEmail(email)) {
        errorMessageDisplay.textContent = "Invalid email format.";
        return;
    }

    if (!validatePassword(password)) {
        errorMessageDisplay.textContent = "Password must be at least 6 characters.";
        return;
    }

    // Sign in using Firebase Auth
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed in 
            const user = userCredential.user;
            window.location.href = "home.html";
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            if (errorCode === 'auth/invalid-credential') {
                errorMessageDisplay.textContent = "Invalid username or password. Please try again.";
            }            
            else {
                errorMessageDisplay.textContent = errorMessage;
            }
        });
});
