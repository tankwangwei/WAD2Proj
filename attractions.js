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

// Get tripID and location from the URL
const urlParams = new URLSearchParams(window.location.search);
const tripID = urlParams.get('tripID');
const location = decodeURIComponent(urlParams.get('location'));

// Set the location input field
const locationInput = document.getElementById("location");
locationInput.value = location;

// Automatically search for attractions on page load if location is defined
document.addEventListener("DOMContentLoaded", () => {
    if (location) {
        searchAttractionsByText(location, displayAttractions);
    }
});

// Initialize autocomplete
initAutocomplete("location", (selectedLocation) => {
    if (selectedLocation) {
        // If a new location is selected, search for attractions in the new location
        searchAttractions(selectedLocation, displayAttractions);
    }
});

// Listen for the search form submission to trigger attractions search
document.getElementById("searchForm").addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent page refresh
    const locationInputValue = locationInput.value;

    // Trigger a new search based on the input value
    if (locationInputValue) {
        searchAttractionsByText(locationInputValue, displayAttractions);
    }
});

// Display attractions in cards
function displayAttractions(attractions) {
    const attractionContainer = document.getElementById('attractionsContainer');
    attractionContainer.innerHTML = ''; // Clear previous results

    if (attractions.length === 0) {
        displayNoAttractionsMessage();
        return;
    }

    attractions.forEach(attraction => {
        const attractionCard = document.createElement('div');
        attractionCard.classList.add('col-md-4', 'mb-4'); // 3 per row

        const imageUrl = attraction.photos && attraction.photos.length > 0
            ? attraction.photos[0].getUrl({ maxWidth: 400 })
            : 'https://via.placeholder.com/400';

        const lat = attraction.geometry.location.lat();
        const lng = attraction.geometry.location.lng();

        attractionCard.innerHTML = `
            <div class="card h-100">
                <img src="${imageUrl}" class="card-img-top" alt="${attraction.name}">
                <div class="card-body">
                    <h5 class="card-title">${attraction.name}</h5>
                    <p class="card-text">Rating: ${attraction.rating || "N/A"}</p>
                    <p class="card-text">Reviews: ${attraction.user_ratings_total || 0}</p>
                    <p class="card-text">Address: ${attraction.formatted_address || attraction.vicinity}</p>

                    <!-- <button class="btn btn-success" onclick="saveActivity('${tripID}', '${attraction.name}', '${attraction.formatted_address || attraction.vicinity}', ${lat}, ${lng}, '${imageUrl}')">Save Activity</button> --!>

                    <div class="save-icon" onclick="saveActivity('${tripID}', '${attraction.name}', '${attraction.formatted_address || attraction.vicinity}', ${lat}, ${lng}, '${imageUrl}', this)">
                        <span class="icon plus-icon" title="Save Activity">＋</span>
                        <span class="icon checkmark-icon" title="Saved" style="display:none;">✔</span>
                    </div>
                </div>
            </div>
        `;
        attractionContainer.append(attractionCard);
    });
}

async function saveActivity(tripID, name, address, lat, lng, imageUrl) {
    try {
        const activityRef = await addDoc(collection(db, `trips/${tripID}/activities`), {
            name: name,
            address: address,
            lat: lat,
            lng: lng,
            imageUrl: imageUrl,
            savedAt: new Date()
        });
        console.log("Activity saved with ID:", activityRef.id);

        iconElement.querySelector('.plus-icon').style.display = 'none';
        iconElement.querySelector('.checkmark-icon').style.display = 'inline';
        showNotification("Activity saved successfully", iconElement.closest('.card'));

    } catch (error) {
        console.error("Error saving activity:", error);
    }
}

function showNotification(message, cardElement) {
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.innerText = message;
    cardElement.appendChild(notification);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

window.saveActivity = saveActivity;