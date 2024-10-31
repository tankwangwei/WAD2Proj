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

initAutocomplete("location", (locationCoords) => {
    // Use the selected coordinates to search for attractions
    searchAttractions(locationCoords, displayAttractions);
});

document.getElementById('searchForm').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent page refresh
    const locationInput = document.getElementById('location').value;
    searchAttractionsByText(locationInput, displayAttractions);
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
                    <button class="btn btn-success" onclick="saveActivity('${tripID}', '${attraction.name}', '${attraction.formatted_address || attraction.vicinity}', ${lat}, ${lng}, '${imageUrl}')">Save Activity</button>
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
    } catch (error) {
        console.error("Error saving activity:", error);
    }
}

window.saveActivity = saveActivity;