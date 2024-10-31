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

// Prevent multiple submissions with a flag
let isSubmitting = false;

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

    // Create new trip in firebase
    try {
        const tripRef = await addDoc(collection(db, "trips"), {
            name: tripName,
            location: location,
            createdAt: new Date()
        });
        
        console.log("New trip created with ID:", tripRef.id);

        // Redirect to the attractions page with trip ID and location as URL parameters
        window.location.href = `attractions.html?tripID=${tripRef.id}&location=${encodeURIComponent(location)}`;
    } catch (error) {
        console.error("Error creating new trip:", error);
    } finally {
        isSubmitting = false; // Reset the flag
    }
});