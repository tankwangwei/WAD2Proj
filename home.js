import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { initAutocomplete, searchAttractions, searchAttractionsByText, displayNoAttractionsMessage } from "./autocomplete.js";

const firebaseConfig = {
    apiKey: "AIzaSyAb7M3MiQ3tGYMT1PCFRam-Z0S6rXqwVcQ",
    authDomain: "wad2-32757.firebaseapp.com",
    projectId: "wad2-32757",
    storageBucket: "wad2-32757.appspot.com",
    messagingSenderId: "191549341083",
    appId: "1:191549341083:web:ad67ea6030d29c8700353e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const userUID = localStorage.getItem("userUID");

if (!userUID) {
    window.location.href = "login.html"; // Redirect to login if not authenticated
}

// Flatpickr Date Range Picker Initialization
document.addEventListener('DOMContentLoaded', function () {
    flatpickr("#date-range", {
        mode: "range",
        dateFormat: "Y-m-d",
        minDate: "today"
    });
});

// Google Places Autocomplete Initialization
// window.onload = function () {
//     let locationEle = document.getElementById("location");
//     let autocomplete = new google.maps.places.Autocomplete(locationEle);

//     autocomplete.addListener('place_changed', function () {
//         let place = autocomplete.getPlace();
//         if (place.geometry) {
//             let latValue = place.geometry.location.lat();
//             let lonValue = place.geometry.location.lng();
//             console.log("Selected Location Latitude:", latValue, "Longitude:", lonValue);
//         }
//     });
// };

// Prevent multiple submissions with a flag
let isSubmitting = false;

// Ensure initAutocomplete function is invoked correctly
initAutocomplete("location", (location) => {
    console.log("Selected location:", location);
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        const userUID = user.uid;

        document.getElementById("newTripForm").addEventListener("submit", async (event) => {
            event.preventDefault(); // Prevent form's default submission behavior

            // Get form fields and error message element
            const tripName = document.getElementById("tripName").value.trim();
            const location = document.getElementById("location").value.trim();
            const dateRange = document.getElementById("date-range").value.trim();
            const errorMessage = document.getElementById("errorMessage");

            const [startDate, endDate] = dateRange.split(" to ");

            const start = new Date(startDate);
            const end = new Date(endDate);
            const days = Math.min(7, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);

            // Store number of days and trip name in localStorage
            localStorage.setItem("tripDays", days);
            localStorage.setItem("tripName", tripName);

            // Validate the form fields
            if (!tripName || !location || !dateRange) {
                errorMessage.style.display = "block"; // Show error message
                errorMessage.innerText = "Please fill in all fields."; // Set error text
                return; // Stop form submission
            } else {
                errorMessage.style.display = "none"; // Hide error message if fields are filled
            }

            // Check if already submitting to avoid duplicates
            if (isSubmitting) return;
            isSubmitting = true;

            try {
                // Create new trip in Firebase
                const tripRef = await addDoc(collection(db, `users/${userUID}/trips`), {
                    name: tripName,
                    location: location,
                    dates: generateDateRange(startDate, endDate),
                    createdAt: new Date()
                });

                // Save the newly created trip ID
                localStorage.setItem("selectedTripId", tripRef.id);

                console.log("New trip created with ID:", tripRef.id);

                // Redirect to the dashboard
                window.location.href = `dashboard.html`;
            } catch (error) {
                console.error("Error creating new trip:", error);
            } finally {
                isSubmitting = false; // Reset the flag
            }
        });
    } else {
        // If not logged in, redirect to login page
        window.location.href = "login.html";
    }
});

function generateDateRange(startDate, endDate) {
    const dates = [];
    const currentDate = new Date(startDate);
    const lastDate = new Date(endDate);

    while (currentDate <= lastDate) {
        dates.push(new Date(currentDate).toISOString().split("T")[0]); // Format as YYYY-MM-DD
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
}