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
    if (user) {
        userId = user.uid; // Save user ID for use in Firestore paths
    } else {
        // If not logged in, redirect to login page
        window.location.href = "login.html";
    }
});

function clearExistingAlerts() {
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
}

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    let location = urlParams.get("location");

    // If the location parameter is null, set it to an empty string
    if (!location || location === "null" || location === null) {
        location = "";
    }

    const locationInput = document.getElementById("location");
    locationInput.value = decodeURIComponent(location);

    // Verify trip ID
    const tripID = getCurrentTripId();
    checkTripID(tripID);

    // Automatically search for attractions if location has a valid value
    if (location.trim() !== "") {
        setTimeout(() => {
            searchAttractionsByText(location, displayAttractions);
        }, 0);
    }

    // Add click handlers to all navbar links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', clearExistingAlerts);
    });

    // For the itinerary builder specifically
    const itineraryLink = document.getElementById("itineraryBuilderLink");
    if (itineraryLink) {
        itineraryLink.addEventListener("click", function (e) {
            clearExistingAlerts();
            const tripId = localStorage.getItem("selectedTripId");
            const location = localStorage.getItem("location");

            if (tripId && location) {
                window.location.href = `itinerary.html?tripId=${tripId}&location=${encodeURIComponent(location)}`;
            } else {
                alert("Please select a trip first!");
            }
        });
    }
});

function initializeTripId() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTripId = urlParams.get('tripID');
    const storedTripId = localStorage.getItem("selectedTripId");

    // Use URL tripID if available, otherwise use stored tripID
    currentTripId = urlTripId || storedTripId;

    console.log('Initialized tripID:', currentTripId);

    if (!currentTripId) {
        showTripAlert();
        return false;
    }

    // Set the location input field if available
    const location = decodeURIComponent(urlParams.get('location') || localStorage.getItem("location") || "");
    const locationInput = document.getElementById("location");
    if (locationInput && location) {
        locationInput.value = location;
    }

    return true;
}

// Get tripID and location from the URL
const urlParams = new URLSearchParams(window.location.search);
const tripID = urlParams.get('tripID');
console.log('Initial tripID from URL:', tripID, 'Type:', typeof tripID);
const location = decodeURIComponent(urlParams.get('location'));

// Set the location input field
const locationInput = document.getElementById("location");
locationInput.value = location;

function checkTripID(tripID) {
    // Remove any existing alerts first
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Check if tripID exists and is valid
    if (!tripID || tripID === "null" || tripID === "undefined") {
        // Create main alert div
        const alert = document.createElement('div');
        alert.className = 'alert alert-warning alert-dismissible fade show';
        alert.setAttribute('role', 'alert');

        // Create text node
        const textNode = document.createTextNode('Please create or select a trip before saving attractions! ');
        alert.appendChild(textNode);

        // Create link
        const link = document.createElement('a');
        link.href = 'home.html';
        link.className = 'alert-link';
        link.textContent = 'Go to Trips';
        alert.appendChild(link);

        // Create close button
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-close';
        closeButton.setAttribute('data-bs-dismiss', 'alert');
        closeButton.setAttribute('aria-label', 'Close');
        alert.appendChild(closeButton);

        // Insert alert at the top of the main container
        const container = document.querySelector('body > div') || document.body;
        container.insertBefore(alert, container.firstChild);

        return false;
    }
    return true;
}
function getCurrentTripId() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTripId = urlParams.get('tripID');
    const storedTripId = localStorage.getItem("selectedTripId");

    console.log('Trip ID from URL:', urlTripId);
    console.log('Trip ID from localStorage:', storedTripId);
    console.log('Using Trip ID:', urlTripId || storedTripId);

    return urlTripId || storedTripId;
}


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
    attractionContainer.innerText = ''; // Clear previous results

    if (attractions.length === 0) {
        displayNoAttractionsMessage();
        return;
    }

    const currentTripId = getCurrentTripId();
    console.log('Current Trip ID in displayAttractions:', currentTripId);

    attractions.forEach(attraction => {
        const attractionCard = document.createElement('div');
        attractionCard.classList.add('col-md-4', 'mb-4'); // 3 per row

        const imageUrl = attraction.photos && attraction.photos.length > 0
            ? attraction.photos[0].getUrl({ maxWidth: 400 })
            : 'https://via.placeholder.com/400';

        const lat = attraction.geometry.location.lat();
        const lng = attraction.geometry.location.lng();

        // Create card structure
        const card = document.createElement('div');
        card.classList.add('card', 'h-100');

        const img = document.createElement('img');
        img.src = imageUrl;
        img.classList.add('card-img-top');
        img.alt = attraction.name;

        const cardBody = document.createElement('div');
        cardBody.classList.add('card-body');

        const title = document.createElement('h5');
        title.classList.add('card-title');
        title.innerText = attraction.name;

        const ratingText = document.createElement('p');
        ratingText.classList.add('card-text');
        ratingText.innerText = `Rating: ${attraction.rating || "N/A"}`;

        const reviewsText = document.createElement('p');
        reviewsText.classList.add('card-text');
        reviewsText.innerText = `Reviews: ${attraction.user_ratings_total || 0}`;

        const addressText = document.createElement('p');
        addressText.classList.add('card-text');
        addressText.innerText = `Address: ${attraction.formatted_address || attraction.vicinity}`;

        // Create save icon section
        const saveIcon = document.createElement('div');
        saveIcon.classList.add('save-icon');
        saveIcon.onclick = () => saveActivity(currentTripId, attraction.name, attraction.formatted_address || attraction.vicinity, lat, lng, imageUrl, saveIcon);

        const plusIcon = document.createElement('span');
        plusIcon.classList.add('icon', 'plus-icon');
        plusIcon.title = "Save Activity";
        plusIcon.innerText = "＋";

        const checkmarkIcon = document.createElement('span');
        checkmarkIcon.classList.add('icon', 'checkmark-icon');
        checkmarkIcon.title = "Saved";
        checkmarkIcon.style.display = "none";
        checkmarkIcon.innerText = "✔";

        saveIcon.appendChild(plusIcon);
        saveIcon.appendChild(checkmarkIcon);

        // Popup content for details
        const popupContent = document.createElement('div');
        popupContent.classList.add('popup-content');

        const popupTitle = document.createElement('div');
        popupTitle.classList.add('popup-title');
        popupTitle.innerText = attraction.name;

        const popupDescription = document.createElement('div');
        popupDescription.classList.add('popup-description');
        popupDescription.id = `about-${attraction.place_id}`;
        popupDescription.innerText = "Loading about...";

        popupContent.appendChild(popupTitle);
        popupContent.appendChild(popupDescription);

        // Assemble card components
        cardBody.appendChild(title);
        cardBody.appendChild(ratingText);
        cardBody.appendChild(reviewsText);
        cardBody.appendChild(addressText);
        cardBody.appendChild(saveIcon);
        cardBody.appendChild(popupContent);

        card.appendChild(img);
        card.appendChild(cardBody);

        attractionCard.appendChild(card);
        attractionContainer.appendChild(attractionCard);

        // Fetch and display the attraction summary
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

    const currentTripId = getCurrentTripId();
    console.log('Trip ID passed to saveActivity:', tripID);
    console.log('Current Trip ID from getCurrentTripId:', currentTripId);

    if (!currentTripId || currentTripId === "null" || currentTripId === "undefined") {
        checkTripID(currentTripId);
        return;
    }

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

document.getElementById("itineraryBuilderLink").addEventListener("click", function () {
    const tripId = localStorage.getItem("selectedTripId");
    const location = localStorage.getItem("location");

    if (tripId && location) {
        window.location.href = `itinerary.html?tripId=${tripId}&location=${encodeURIComponent(location)}`;
    } else {
        alert("Please select a trip first!");
    }
});