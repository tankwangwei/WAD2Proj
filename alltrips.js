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
    itinerariesContainer.innerText = "";

    const tripRef = collection(db, `users/${userId}/trips`);
    const snapshot = await getDocs(tripRef);

    if (snapshot.empty) {
        itinerariesContainer.innerText = "No itineraries found. Start planning your first trip!";
        return;
    }

    // Populate the itineraries array with fetched data
    itineraries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    displayItineraries(itineraries);
}

// Display itineraries based on the given list
async function displayItineraries(itinerariesList) {
    const itinerariesContainer = document.getElementById("itinerariesContainer");
    itinerariesContainer.innerText = "";

    if (itinerariesList.length === 0) {
        itinerariesContainer.innerText = "No itineraries found. Start planning your first trip!";
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

        // Create card elements
        const card = document.createElement("div");
        card.className = "card h-100";

        const cardImageTop = document.createElement("div");
        cardImageTop.className = "card-image-top";
        cardImageTop.style.height = "200px";
        cardImageTop.style.overflow = "hidden";

        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt = itinerary.location;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";

        const cardBody = document.createElement("div");
        cardBody.className = "card-body";

        const cardTitle = document.createElement("h5");
        cardTitle.className = "card-title";
        cardTitle.innerText = itinerary.name;

        const cardText = document.createElement("p");
        cardText.className = "card-text";

        const locationIcon = document.createElement("i");
        locationIcon.className = "fas fa-map-marker-alt";
        const locationText = document.createTextNode(` ${itinerary.location}`);
        cardText.appendChild(locationIcon);
        cardText.appendChild(locationText);
        cardText.appendChild(document.createElement("br"));

        const dateIcon = document.createElement("i");
        dateIcon.className = "fas fa-calendar";
        const dateText = document.createTextNode(` ${itinerary.dates ? `${itinerary.dates[0]} to ${itinerary.dates[itinerary.dates.length - 1]}` : 'Dates not set'}`);
        cardText.appendChild(dateIcon);
        cardText.appendChild(dateText);
        cardText.appendChild(document.createElement("br"));

        const createdText = document.createElement("small");
        createdText.className = "text-muted";
        createdText.innerText = `Created on: ${itinerary.createdAt?.toDate ? itinerary.createdAt.toDate().toLocaleDateString() : "Date not available"}`;
        cardText.appendChild(createdText);

        const buttonContainer = document.createElement("div");
        buttonContainer.className = "d-flex justify-content-between align-items-center";

        const viewButton = document.createElement("button");
        viewButton.className = "btn btn-primary";
        viewButton.innerText = "View";
        viewButton.onclick = () => {
            window.location.href = `dashboard.html?tripID=${itinerary.id}&location=${encodeURIComponent(itinerary.location)}`;
        };

        const deleteButton = document.createElement("button");
        deleteButton.className = "btn btn-danger";
        deleteButton.innerText = "Delete";
        deleteButton.onclick = (event) => {
            event.stopPropagation();
            deleteTrip(itinerary.id, col);
        };

        // Assemble card elements
        cardImageTop.appendChild(img);
        buttonContainer.appendChild(viewButton);
        buttonContainer.appendChild(deleteButton);
        cardBody.appendChild(cardTitle);
        cardBody.appendChild(cardText);
        cardBody.appendChild(buttonContainer);
        card.appendChild(cardImageTop);
        card.appendChild(cardBody);
        col.appendChild(card);

        itinerariesContainer.appendChild(col);
    }
}

// to delete trip
window.deleteTrip = async function (tripId, itineraryItem) {
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
