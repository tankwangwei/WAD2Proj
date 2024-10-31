import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
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

document.getElementById("newTripForm").addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent form's default submission behavior

    // Check if already submitting to avoid duplicates
    if (isSubmitting) return;
    isSubmitting = true;

    const tripName = document.getElementById("tripName").value;
    const location = document.getElementById("location").value;
    const dateRange = document.getElementById("date-range").value;

    // Split the date range into start and end dates
    const [startDate, endDate] = dateRange.split(" to ");
    
    // Generate all dates between start and end dates
    const tripDates = generateDateRange(startDate, endDate);

    // Create new trip in Firebase
    try {
        const tripRef = await addDoc(collection(db, "trips"), {
            name: tripName,
            location: location,
            dates: tripDates,
            createdAt: new Date()
        });

        console.log("New trip created with ID:", tripRef.id);

        // Redirect to the attractions page with trip ID and location as URL parameters
        // window.location.href = `attractions.html?tripID=${tripRef.id}&location=${encodeURIComponent(location)}`;
        window.location.href = 'dashboard.html'
    } catch (error) {
        console.error("Error creating new trip:", error);
    } finally {
        isSubmitting = false; // Reset the flag
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