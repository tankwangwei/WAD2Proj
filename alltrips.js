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
async function displayItineraries(itinerariesList) {
    const itinerariesContainer = document.getElementById("itinerariesContainer");
    itinerariesContainer.innerHTML = "";

    if (itinerariesList.length === 0) {
        itinerariesContainer.innerHTML = "<p>No itineraries found. Start planning your first trip!</p>";
        return;
    }

    for (const itinerary of itinerariesList) {
        const col = document.createElement("div");
        col.className = "col-md-4 mb-4"; // 3 cards per row

        // Fetch image from Unsplash
        let imageUrl = '';
        try {
            const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(itinerary.location)}&client_id=si0ikrNV-cDKP406cBzHlljJmq6GWhlkdAXeho1tzDU`;
            const response = await axios.get(unsplashUrl);
            if (response.data.results.length > 0) {
                imageUrl = response.data.results[0].urls.regular;
            }
        } catch (error) {
            console.error("Error fetching Unsplash image:", error);
            imageUrl = './imgs/default-placeholder.jpg'; // Fallback image
        }

        const cardHtml = `
            <div class="card h-100">
                <div class="card-image-top" style="height: 200px; overflow: hidden;">
                    <img src="${imageUrl}" alt="${itinerary.location}" 
                         style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div class="card-body">
                    <h5 class="card-title">${itinerary.name}</h5>
                    <p class="card-text">
                        <i class="fas fa-map-marker-alt"></i> ${itinerary.location}<br>
                        <i class="fas fa-calendar"></i> ${itinerary.dates ? `${itinerary.dates[0]} to ${itinerary.dates[itinerary.dates.length - 1]}` : 'Dates not set'}<br>
                        <small class="text-muted">Created on: ${itinerary.createdAt?.toDate ? itinerary.createdAt.toDate().toLocaleDateString() : "Date not available"}</small>
                    </p>
                    <div class="d-flex justify-content-between align-items-center">
                        <button class="btn btn-primary" onclick="window.location.href='dashboard.html?tripID=${itinerary.id}&location=${encodeURIComponent(itinerary.location)}'">View</button>
                        <button class="btn btn-danger" onclick="event.stopPropagation(); deleteTrip('${itinerary.id}', this.closest('.col-md-4'))">Delete</button>
                    </div>
                </div>
            </div>
        `;

        col.innerHTML = cardHtml;
        itinerariesContainer.appendChild(col);
    }
}
// to delete trip
window.deleteTrip = async function(tripId, itineraryItem) {
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
        deleteToast.classList.add('show');

        // Hide the toast automatically after 3 seconds
        setTimeout(() => {
            deleteToast.classList.remove('show');
        }, 3000);

        // Close the toast when the close button is clicked
        const closeButton = deleteToast.querySelector('.btn-close');
        closeButton.addEventListener('click', () => {
            deleteToast.classList.remove('show');
        });

    } catch (error) {
        console.error("Error deleting trip: ", error);
    }
};


// Filter itineraries based on search input
document.getElementById("searchBar").addEventListener("input", (event) => {
    const searchTerm = event.target.value.toLowerCase();
    const filteredItineraries = itineraries.filter(itinerary =>
        itinerary.name.toLowerCase().includes(searchTerm) ||
        itinerary.location.toLowerCase().includes(searchTerm)
    );
    displayItineraries(filteredItineraries);
});
