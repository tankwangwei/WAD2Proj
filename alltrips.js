import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
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
let itineraries = []; // Store all itineraries to filter later

localStorage.removeItem("selectedTripId");

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

    const tripRef = collection(db, `users/${userId}/trips`);
    const snapshot = await getDocs(tripRef);

    if (snapshot.empty) {
        itinerariesContainer.innerHTML = "<p>No itineraries found. Start planning your first trip!</p>";
        return;
    }

    // Populate the itineraries array with fetched data
    itineraries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    displayItineraries(itineraries);
}

// Display itineraries based on the given list
function displayItineraries(itinerariesList) {
    const itinerariesContainer = document.getElementById("itinerariesContainer");
    itinerariesContainer.innerHTML = "";

    itinerariesList.forEach(itinerary => {
        const itineraryItem = document.createElement("div");
        itineraryItem.className = "list-group-item d-flex justify-content-between align-items-center";

        const itineraryLink = document.createElement("a");
        itineraryLink.href = `#`;
        itineraryLink.className = "list-group-item-action flex-grow-1";
        itineraryLink.innerHTML = `
            <h5>${itinerary.name}</h5>
            <p>${itinerary.location} - Created on: ${itinerary.createdAt?.toDate ? itinerary.createdAt.toDate().toLocaleDateString() : "Date not available"}</p>
        `;
        itineraryLink.addEventListener('click', () => {
            localStorage.setItem("selectedTripId", itinerary.id);
            window.location.href = `dashboard.html?tripID=${itinerary.id}&location=${encodeURIComponent(itinerary.location)}`;
        });

        const deleteButton = document.createElement("button");
        deleteButton.className = "btn btn-danger btn-sm";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTrip(itinerary.id, itineraryItem);
        });

        itineraryItem.appendChild(itineraryLink);
        itineraryItem.appendChild(deleteButton);
        itinerariesContainer.appendChild(itineraryItem);
    });
}

// Function to delete a trip
async function deleteTrip(tripId, itineraryItem) {
    try {
        await deleteDoc(doc(db, `users/${userId}/trips`, tripId));
        
        // Remove the item from the main itineraries array
        itineraries = itineraries.filter(itinerary => itinerary.id !== tripId);

        // Reapply the search filter to display updated results
        const searchTerm = document.getElementById("searchBar").value.toLowerCase();
        const filteredItineraries = itineraries.filter(itinerary => 
            itinerary.name.toLowerCase().includes(searchTerm) || 
            itinerary.location.toLowerCase().includes(searchTerm)
        );
        displayItineraries(filteredItineraries);

        // Show the toast manually
        const deleteToast = document.getElementById('deleteToast');
        deleteToast.classList.add('show'); // Add 'show' class to display the toast

        // Hide the toast automatically after 3 seconds
        setTimeout(() => {
            deleteToast.classList.remove('show');
        }, 3000); // Toast will be visible for 3 seconds

        // Close the toast when the close button is clicked
        const closeButton = deleteToast.querySelector('.btn-close');
        closeButton.addEventListener('click', () => {
            deleteToast.classList.remove('show');
        });

    } catch (error) {
        console.error("Error deleting trip: ", error);
    }
}

// Filter itineraries based on search input
document.getElementById("searchBar").addEventListener("input", (event) => {
    const searchTerm = event.target.value.toLowerCase();
    const filteredItineraries = itineraries.filter(itinerary =>
        itinerary.name.toLowerCase().includes(searchTerm) ||
        itinerary.location.toLowerCase().includes(searchTerm)
    );
    displayItineraries(filteredItineraries);
});
