import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

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

async function saveActivity(name, address, imageUrl) {
    try {
        const docRef = await addDoc(collection(db, "savedActivities"), {
            name: name,
            address: address,
            imageUrl: imageUrl
        });
        console.log("Activity saved with ID: ", docRef.id);
    } catch (error) {
        console.log(error.message);
    }
}

// Expose saveActivity to the global scope
window.saveActivity = saveActivity;

let autocomplete;

function initAutocomplete() {
    const input = document.getElementById('location');
    autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['(cities)'] // Autocomplete limited to cities, can modify to states or countries if needed
    });

    // Listener to handle place selection, Google Maps Javascript API method
    autocomplete.addListener('place_changed', onPlaceChanged);
}


function onPlaceChanged() {
    const place = autocomplete.getPlace();
    if (!place.geometry) {
        console.log("No details available for the selected location.");
        return;
    }
    searchAttractions(place.geometry.location);
}


document.getElementById('searchForm').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent page refresh
    const locationInput = document.getElementById('location').value;
    searchAttractionsByText(locationInput);
});

// Search for attractions based on location coordinates using Google Places API
function searchAttractions(location) {
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    const request = {
        location: location,
        // rankBy: google.maps.places.RankBy.PROMINENCE,
        radius: '50000', // Search within 50km
        type: [
            'tourist_attraction',
            // 'park',
            // 'museum',
            // 'art_gallery',
            // 'shopping_mall',
            // 'zoo',
            // 'amusement_park',
            // 'aquarium',
            // 'stadium',
            // 'point_of_interest'
        ],
    };

    service.nearbySearch(request, function (results, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
            const topRatedPlaces = results
                .sort((a, b) => b.rating - a.rating) // sort by descending order
            // .filter(place => place.rating >= 3.5 && !place.types.includes('lodging')); // idk if we want this filter.. do we?
            displayAttractions(topRatedPlaces);
        } else {
            displayNoAttractionsMessage();
        }
    });
}

// Search for attractions by location name using Google Places Text Search API
function searchAttractionsByText(location) {
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    const request = {
        query: location,
        type: ['locality'] // Search for cities, towns, or other locations
    };

    service.textSearch(request, function (results, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {

            // Get coordinates of the first result
            const locationCoords = results[0].geometry.location;

            // Use Nearby Search
            searchAttractions(locationCoords);

            // This is to ensure consistent results whether the user clicks on suggestions or presses the search button

        } else {
            displayNoAttractionsMessage();
        }
    });
}

// Display attractions in cards
function displayAttractions(attractions) {
    const attractionContainer = document.getElementById('attractionsContainer');
    attractionContainer.innerHTML = ''; // Clear previous results

    attractions.forEach(attraction => {
        const attractionCard = document.createElement('div');
        attractionCard.classList.add('col-md-4', 'mb-4'); // 3 per row

        const imageUrl = attraction.photos && attraction.photos.length > 0
            ? attraction.photos[0].getUrl({ maxWidth: 400 })
            : 'https://via.placeholder.com/400';

        attractionCard.innerHTML = `
            <div class="card h-100">
                <img src="${imageUrl}" class="card-img-top" alt="${attraction.name}">
                <div class="card-body">
                    <h5 class="card-title">${attraction.name}</h5>
                    <p class="card-text">Rating: ${attraction.rating}</p>
                    <p class="card-text">Reviews: ${attraction.user_ratings_total}</p>
                    <p class="card-text">Address: ${attraction.formatted_address || attraction.vicinity}</p>
                    <button class="btn btn-success" onclick="saveActivity('${attraction.name}', '${attraction.formatted_address || attraction.vicinity}', '${imageUrl}')">Save Activity</button>
                </div>
            </div>
        `;
        attractionContainer.append(attractionCard);
    });
}

// Display a message when no attractions are found
function displayNoAttractionsMessage() {
    const attractionContainer = document.getElementById('attractionsContainer');
    attractionContainer.innerHTML = ''; // Clear previous results
    attractionContainer.innerHTML = '<h2>No attractions found.</h2>'; // Show message if no attractions
}

window.onload = function () {
    initAutocomplete();
};