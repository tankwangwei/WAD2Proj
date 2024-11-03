import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
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
let userId;

onAuthStateChanged(auth, (user) => {
    const tripId = localStorage.getItem("tripId");

    if (user) {
        const userId = user.uid;
        localStorage.setItem("userId", userId); // Ensure userId is stored for consistent access
        
        // Check if tripId exists
        if (!tripId) {
            window.location.href = "home.html"; // Redirect to home if trip is not selected
        }
    } else {
        // Redirect to login if user is not authenticated
        window.location.href = "login.html";
    }
});


// Get tripID and location from the URL
const urlParams = new URLSearchParams(window.location.search);
const tripID = urlParams.get('tripID') || localStorage.getItem("tripId");
localStorage.setItem("tripId", tripId); // Store for consistent access
const location = decodeURIComponent(urlParams.get('location'));

// Set the location input field
const locationInput = document.getElementById("location");
locationInput.value = location;

// Automatically search for attractions on page load if location is defined
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    let location = urlParams.get("location");

    // If the location parameter is null, set it to an empty string
    if (!location || location === "null" || location === null) {
        location = "";
    }

    const locationInput = document.getElementById("location");
    locationInput.value = decodeURIComponent(location);

    // Automatically search for attractions if location has a valid value
    if (location.trim() !== "") {
        // Directly trigger the attraction search without button click
        setTimeout(() => {
            searchAttractionsByText(location, displayAttractions);
        }, 0);
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
                    
                    <div class="save-icon" onclick="saveActivity('${tripID}', '${attraction.name}', '${attraction.formatted_address || attraction.vicinity}', ${lat}, ${lng}, '${imageUrl}', this)">
                        <span class="icon plus-icon" title="Save Activity">＋</span>
                        <span class="icon checkmark-icon" title="Saved" style="display:none;">✔</span>
                    </div>

                    <!-- Popup Content -->
                    <div class="popup-content">
                        <div class="popup-title">${attraction.name}</div>
                        <div class="popup-description" id="about-${attraction.place_id}">Loading about...</div>
                    </div>
                </div>
            </div>
        `;
        attractionContainer.append(attractionCard);

        fetchAttractionSummary(attraction.name, `about-${attraction.place_id}`);
    });
}

async function fetchAttractionSummary(attractionName, elementId) {
    try {
        const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(attractionName)}`);
        const data = await response.json();

        if (data.extract) {
            document.getElementById(elementId).innerText = data.extract;
        } else {
            document.getElementById(elementId).innerText = "No additional information available.";
        }
    } catch (error) {
        console.error("Error fetching Wikipedia summary:", error);
        document.getElementById(elementId).innerText = "Information unavailable.";
    }
}

async function saveActivity(tripID, name, address, lat, lng, imageUrl, iconElement) {
    try {
        // Check if activity already exists in Firestore
        const activitiesRef = collection(db, `users/${userId}/trips/${tripID}/activities`);
        const q = query(activitiesRef, where("name", "==", name), where("address", "==", address));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Activity already exists
            showNotification("Activity is already saved", iconElement.closest('.card'));
            return;
        }

        const activityRef = await addDoc(collection(db, `users/${userId}/trips/${tripID}/activities`), {
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