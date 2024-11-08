import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
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

let map;
let markers = [];
let places = [];
let activities = [];
let tripDates = [];
let weatherData = {};
let allPlaces = [];

const WEATHER_API_KEY = "4e1a69304c74566a0ebcf18acbafbc18"; // Replace with your API key

let userId, tripId, location;

const urlParams = new URLSearchParams(window.location.search);
tripId = urlParams.get("tripId") || localStorage.getItem("tripId");
location = urlParams.get("location") || localStorage.getItem("location");

if (!tripId || !location) {
    console.error("Missing tripId or location. Redirecting to dashboard.");
    window.location.href = "dashboard.html";
} else {
    localStorage.setItem("tripId", tripId);
    localStorage.setItem("location", location);
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        userId = user.uid;
        localStorage.setItem("userId", userId);
        initItinerary();
    } else {
        window.location.href = "login.html";
    }
});

async function initItinerary() {
    const tripSnapshot = await getDocs(collection(db, `users/${userId}/trips`));
    const tripData = tripSnapshot.docs.find((doc) => doc.id === tripId)?.data();

    if (!tripData) {
        console.error("Trip not found.");
        window.location.href = "dashboard.html";
        return;
    }

    const { latitude, longitude, dates } = tripData;
    tripDates = dates;
    const locationCoords = { lat: latitude, lng: longitude };

    await fetchWeather(locationCoords);
    initMap(locationCoords);
    displayCalendar(dates);
    loadPlaces(locationCoords);
    loadSavedActivities();
}

async function fetchWeather(locationCoords) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/onecall?lat=${locationCoords.lat}&lon=${locationCoords.lng}&exclude=minutely,hourly&units=metric&appid=${WEATHER_API_KEY}`
        );
        const data = await response.json();
        weatherData = data.daily.reduce((acc, day) => {
            const date = new Date(day.dt * 1000).toISOString().split("T")[0];
            acc[date] = {
                temp: day.temp.day,
                weather: day.weather[0].description,
            };
            return acc;
        }, {});
    } catch (error) {
        console.error("Error fetching weather:", error);
    }
}

function initMap(locationCoords) {
    map = new google.maps.Map(document.getElementById("map"), {
        center: locationCoords,
        zoom: 13,
    });
}

function loadPlaces(locationCoords) {
    const placesService = new google.maps.places.PlacesService(map);
    const request = {
        location: new google.maps.LatLng(locationCoords.lat, locationCoords.lng),
        radius: "50000",
        type: ["tourist_attraction", "restaurant", "cafe", "lodging", "store", "bar"],
    };

    placesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            // Store all valid places
            allPlaces = results.filter((place) => {
                const location = place.geometry?.location;
                return location && !isNaN(location.lat()) && !isNaN(location.lng());
            });

            displayPlaces(allPlaces); // Show all places
            addMarkers(allPlaces);   // Add all markers
        } else {
            console.error("Error loading places:", status);
        }
    });
}


function displayPlaces(places) {
    const placesList = document.getElementById("placesList");
    placesList.innerHTML = "";

    places.forEach((place) => {
        const photoUrl = place.photos
            ? place.photos[0].getUrl({ maxWidth: 100 })
            : "https://via.placeholder.com/100x100?text=No+Image";

        const placeEl = document.createElement("div");
        placeEl.classList.add("place-item", "card", "p-2", "m-2");
        placeEl.innerHTML = `
            <div class="row">
                <div class="col-3">
                    <img src="${photoUrl}" alt="${place.name}" class="img-fluid">
                </div>
                <div class="col-9">
                    <h5>${place.name}</h5>
                    <p>${place.vicinity || "No address available"}</p>
                    <p>Rating: ${place.rating || "N/A"} (${place.user_ratings_total || 0} reviews)</p>
                    <button onclick="savePlace('${place.place_id}', '${place.name}')">Save</button>
                </div>
            </div>
        `;
        placesList.appendChild(placeEl);
    });
}

function addMarkers(places) {
    clearMarkers();

    places.forEach((place) => {
        const location = place.geometry?.location;

        if (location && !isNaN(location.lat()) && !isNaN(location.lng())) {
            const marker = new google.maps.Marker({
                position: location,
                map: map,
                title: place.name,
            });
            markers.push(marker);
        } else {
            console.warn(`Invalid marker position for place: ${place.name}`);
        }
    });
}



function clearMarkers() {
    markers.forEach((marker) => marker.setMap(null));
    markers = [];
}

function updateMapMarkers(places) {
    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    markers = [];

    // Add new markers for the filtered places
    places.forEach(place => {
        const marker = new google.maps.Marker({
            position: { lat: place.lat, lng: place.lng },
            map: map,
            title: place.name
        });
        markers.push(marker);
    });
}


async function loadSavedActivities() {
    const savedActivitiesContainer = document.getElementById("savedActivities");
    savedActivitiesContainer.innerHTML = "";

    try {
        const snapshot = await getDocs(collection(db, `users/${userId}/trips/${tripId}/activities`));
        snapshot.forEach(doc => {
            const activity = doc.data();
            const activityId = doc.id;

            const activityEl = document.createElement("div");
            activityEl.classList.add("activity-item");
            activityEl.innerHTML = `
                <span>${activity.name}</span>
                <button class="btn btn-sm btn-danger" onclick="removeActivity('${activityId}')">Remove</button>
            `;
            savedActivitiesContainer.appendChild(activityEl);
        });
    } catch (error) {
        console.error("Error loading saved activities:", error);
    }
}


function savePlace(placeId, name) {
    const activity = { id: placeId, name };
    activities.push(activity);
    addDoc(collection(db, `users/${userId}/trips/${tripId}/activities`), activity).then(() => {
        loadSavedActivities();
    });
}

async function removeActivity(activityId) {
    try {
        await deleteDoc(doc(db, `users/${userId}/trips/${tripId}/activities`, activityId));
        // Refresh the saved activities list
        loadSavedActivities();
    } catch (error) {
        console.error("Error removing activity:", error);
    }
}

function displayCalendar(dates) {
    const calendar = document.getElementById("calendar");
    calendar.innerHTML = "";

    dates.forEach((date) => {
        const weather = weatherData[date]
            ? `${weatherData[date].temp}°C, ${weatherData[date].weather}`
            : "No weather data";

        const dateContainer = document.createElement("div");
        dateContainer.classList.add("card", "p-3", "mb-3");
        dateContainer.dataset.date = date;
        dateContainer.innerHTML = `
            <h6>${new Date(date).toLocaleDateString()}</h6>
            <p>${weather}</p>
            <div class="activity-dropzone" ondrop="drop(event)" ondragover="allowDrop(event)"></div>
        `;
        calendar.appendChild(dateContainer);
    });
}

function applyFilters() {
    // Get all selected filter buttons
    const selectedFilters = Array.from(document.querySelectorAll('.filter-btn.active'))
        .map(button => button.getAttribute('data-category'));

    if (selectedFilters.length === 0) {
        // If no filters are selected, display all places
        displayPlaces(allPlaces);
        addMarkers(allPlaces);
        return;
    }

    // Filter places based on selected categories
    const filteredPlaces = allPlaces.filter(place =>
        selectedFilters.some(filter => (place.types || []).includes(filter))
    );

    // Update the places list and map markers
    displayPlaces(filteredPlaces);
    addMarkers(filteredPlaces);
}

function clearFilters() {
    document.querySelectorAll(".filter-btn").forEach((button) => button.classList.remove("active"));
    displayPlaces(allPlaces); // Reset places list
    addMarkers(allPlaces);    // Reset markers
}

function toggleFilter(button) {
    button.classList.toggle("active");
}

function allowDrop(event) {
    event.preventDefault();
}

function drop(event) {
    event.preventDefault();
    const activityId = event.dataTransfer.getData("activityId");
    const date = event.target.closest(".card")?.dataset.date;

    if (date) {
        const activity = activities.find((act) => act.id === activityId);
        if (activity) addActivityToDate(date, activity);
    }
}

function addActivityToDate(date, activity) {
    const dateContainer = document.querySelector(`.card[data-date="${date}"] .activity-dropzone`);
    const activityEl = document.createElement("div");
    activityEl.className = "activity-item";
    activityEl.textContent = activity.name;
    dateContainer.appendChild(activityEl);
}

// Expose functions globally
window.savePlace = savePlace;
window.allowDrop = allowDrop;
window.drop = drop;
window.removeActivity = removeActivity;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
