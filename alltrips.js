import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

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

let userId;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid;
        await loadUserItineraries(userId);
    } else {
        window.location.href = "login.html"; 
    }
});

async function loadUserItineraries(userId) {
    const itinerariesContainer = document.getElementById("itinerariesContainer");
    itinerariesContainer.innerHTML = ""; 

    const itinerariesRef = collection(db, `users/${userId}/trips`);
    const snapshot = await getDocs(itinerariesRef);

    if (snapshot.empty) {
        itinerariesContainer.innerHTML = "<p>No itineraries found. Start planning your first trip!</p>";
        return;
    }

    snapshot.forEach((doc) => {
        const itinerary = doc.data();
        const itineraryId = doc.id;
        
        // Create a clickable link for each itinerary
        const itineraryLink = document.createElement("a");
        itineraryLink.href = `dashboard.html?tripID=${itineraryId}`;
        itineraryLink.className = "list-group-item list-group-item-action";
        itineraryLink.innerHTML = `
            <h5>${itinerary.name}</h5>
            <p>${itinerary.location} - Created on: ${itinerary.createdAt?.toDate ? itinerary.createdAt.toDate().toLocaleDateString() : "Date not available"}</p>
        `;

        itinerariesContainer.appendChild(itineraryLink);
    });
}