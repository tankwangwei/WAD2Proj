import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, getDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
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

// Global variables
let map;
let markers = [];
let activities = [];
let tripDates = [];
let weatherData = {};
let allPlaces = [];
let currentSearchQuery = ""; // To store the current search query
let currentSearchResults = []; // To store the current search results
let userId, tripId, location;

const WEATHER_API_KEY = "4e1a69304c74566a0ebcf18acbafbc18";

// Get trip and location from URL or localStorage
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

// Initialise itinerary
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
    loadItinerary();
}

// Fetch weather data
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

// Initialise map
function initMap(locationCoords) {
    map = new google.maps.Map(document.getElementById("map"), {
        center: locationCoords,
        zoom: 13,
    });
}

// Search places in search bar
function searchPlaces() {
    const query = document.getElementById("searchInput").value.trim();
    currentSearchQuery = query; // Update the current search query

    if (!query) {
        // If the search query is empty, reset to the original allPlaces
        displayPlaces(allPlaces);
        addMarkers(allPlaces);
        currentSearchResults = allPlaces; // Reset search results
        return;
    }

    const service = new google.maps.places.PlacesService(map);

    const request = {
        query: query,
        location: map.getCenter(), // Ensure search is centered around the trip location
        radius: "50000",
        fields: ["name", "geometry", "formatted_address", "rating", "photos", "place_id", "user_ratings_total"],
    };

    service.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            // Update the places list and map markers with the search results
            currentSearchResults = results; // Store the search results
            displayPlaces(results);
            addMarkers(results);
        } else {
            console.error("Error during search:", status);
            alert("No results found. Try a different search query.");
        }
    });
}

// Load places in general (placelist)
function loadPlaces(locationCoords) {
    const placesService = new google.maps.places.PlacesService(map);
    const request = {
        location: new google.maps.LatLng(locationCoords.lat, locationCoords.lng),
        radius: "50000",
        type: ["tourist_attraction"],
    };

    //, "restaurant", "cafe", "lodging", "store", "bar"

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

// Display places in placeslist
function displayPlaces(places) {
    const placesList = document.getElementById("placesList");
    placesList.innerHTML = ""; // Clear the list

    places.forEach((place) => {
        const photoUrl = place.photos
            ? place.photos[0].getUrl({ maxWidth: 100 })
            : "https://via.placeholder.com/100x100?text=No+Image";

        // Wrapper for the card and button
        const placeWrapper = document.createElement("div");
        placeWrapper.classList.add("mb-3", "place-wrapper");

        // Card for the place details
        const placeEl = document.createElement("div");
        placeEl.classList.add("place-item", "card", "p-3");

        // Add click event to navigate to place details
        placeEl.addEventListener("click", () => {
            displayPlaceDetails(place.place_id);
        });

        placeEl.innerHTML = `
            <div class="row">
                <div class="col-3">
                    <img src="${photoUrl}" alt="${place.name}" class="img-fluid rounded">
                </div>
                <div class="col-9">
                    <h5>${place.name}</h5>
                    <p>${place.vicinity || "No address available"}</p>
                    <p>Rating: ${place.rating || "N/A"} (${place.user_ratings_total || 0} reviews)</p>
                </div>
            </div>
        `;

        // Create the Save button
        const saveButton = document.createElement("button");
        saveButton.classList.add("btn", "btn-primary", "save-button", "w-100");
        saveButton.textContent = "Save";
        saveButton.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent triggering card's click event
            savePlace(place.place_id, place.name); // Save the place
        });

        // Append the card and button to the wrapper
        placeWrapper.appendChild(placeEl);
        placeWrapper.appendChild(saveButton);

        // Append the wrapper to the list
        placesList.appendChild(placeWrapper);
    });
}



// Place details when click on one
function displayPlaceDetails(placeId) {
    const placesService = new google.maps.places.PlacesService(map);

    placesService.getDetails({ placeId }, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            // Create the carousel if photos are available
            let carouselHTML = "";
            if (place.photos && place.photos.length > 0) {
                const photos = place.photos.slice(0, 5); // Limit to the first 5 photos
                carouselHTML = `
                    <div id="placePhotosCarousel" class="carousel slide" data-bs-ride="carousel">
                        <div class="carousel-inner">
                            ${photos
                        .map((photo, index) => `
                                <div class="carousel-item ${index === 0 ? "active" : ""}">
                                    <img src="${photo.getUrl({ maxWidth: 800 })}" class="d-block w-100" alt="Photo ${index + 1}">
                                </div>
                            `)
                        .join("")}
                        </div>
                        <button class="carousel-control-prev" type="button" data-bs-target="#placePhotosCarousel" data-bs-slide="prev">
                            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Previous</span>
                        </button>
                        <button class="carousel-control-next" type="button" data-bs-target="#placePhotosCarousel" data-bs-slide="next">
                            <span class="carousel-control-next-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Next</span>
                        </button>
                    </div>
                `;
            } else {
                carouselHTML = `<p>No photos available for this location.</p>`;
            }

            // Display the place details
            const placesListContainer = document.getElementById("placesList");
            placesListContainer.innerHTML = `
                <button id="backToList" class="btn btn-secondary mb-3">Back to List</button>
                ${carouselHTML}
                <h3 class="mt-4">${place.name}</h3>
                <p><strong>Rating:</strong> ${place.rating || "N/A"} (${place.user_ratings_total || 0} reviews)</p>
                <p><strong>Address:</strong> ${place.formatted_address || "Not available"}</p>
                <p><strong>Opening Hours:</strong> ${place.opening_hours?.weekday_text?.join(", ") || "Not available"
                }</p>
                <p><strong>Phone:</strong> ${place.formatted_phone_number || "Not available"}</p>
                <p><strong>Website:</strong> <a href="${place.website}" target="_blank">${place.website || "Not available"}</a></p>
                <p><strong>Description:</strong> ${place.editorial_summary?.overview || "No description available."
                }</p>
            `;

            // Add back button functionality
            document.getElementById("backToList").addEventListener("click", () => {
                // Restore search results or all places
                if (currentSearchQuery && currentSearchResults.length > 0) {
                    displayPlaces(currentSearchResults); // Restore search results
                    addMarkers(currentSearchResults);
                } else {
                    displayPlaces(allPlaces); // Default to all places
                    addMarkers(allPlaces);
                }

                // Restore the search input
                document.getElementById("searchInput").value = currentSearchQuery;
            });

            // Highlight the marker on the map
            highlightMarker(place.geometry.location);
        } else {
            console.error("Error fetching place details:", status);
        }
    });
}



let selectedMarker = null;

function highlightMarker(location) {
    if (selectedMarker) {
        selectedMarker.setIcon(null); // Reset icon
    }

    selectedMarker = markers.find(marker =>
        marker.getPosition().lat() === location.lat() &&
        marker.getPosition().lng() === location.lng()
    );

    if (selectedMarker) {
        selectedMarker.setIcon("http://maps.google.com/mapfiles/ms/icons/green-dot.png");
        map.setCenter(selectedMarker.getPosition());
    } else {
        console.warn("Marker not found for the selected location.");
    }
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
    selectedMarker = null; // Reset highlighted marker
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
        snapshot.forEach((doc) => {
            const activity = doc.data();
            const activityId = doc.id;

            // Only display activities not already in the calendar
            if (!isActivityInCalendar(activityId)) {
                const activityEl = createActivityCard(activityId, activity.name, true, "savedActivities");
                savedActivitiesContainer.appendChild(activityEl);
            }
        });
    } catch (error) {
        console.error("Error loading saved activities:", error);
    }
}


function createActivityCard(activityId, name, isRemovable = false, source = "savedActivities", date = null) {
    const activityEl = document.createElement("div");
    activityEl.classList.add("activity-item", "card", "p-2", "m-2");
    activityEl.draggable = true;
    activityEl.dataset.activityId = activityId;

    // Dragstart event listener
    activityEl.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("activityId", activityId);
        event.dataTransfer.setData("source", source);
        if (date) {
            event.dataTransfer.setData("sourceDate", date);
        }
    });

    // Include the Remove Button for both Saved Activities and Calendar
    const removeHandler = source === "calendar" 
        ? `removeActivityFromDate('${date}', '${activityId}')` 
        : `removeActivity('${activityId}')`;

    activityEl.innerHTML = `
        <span>${name}</span>
        ${isRemovable ? `<button class="btn btn-sm btn-danger mt-2" onclick="${removeHandler}">Remove</button>` : ""}
    `;

    return activityEl;
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
        // Remove the activity from the database
        await deleteDoc(doc(db, `users/${userId}/trips/${tripId}/activities`, activityId));

        // Refresh the Saved Activities section
        loadSavedActivities();

        console.log(`Activity ${activityId} removed successfully.`);
    } catch (error) {
        console.error(`Error removing activity ${activityId}:`, error);
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

        // Allow dragover and drop
        dateContainer.addEventListener("dragover", (event) => event.preventDefault());
        dateContainer.addEventListener("drop", (event) => handleDrop(event, date));

        dateContainer.innerHTML = `
            <h6>${new Date(date).toLocaleDateString()}</h6>
            <p>${weather}</p>
            <div class="activity-dropzone"></div>
        `;
        // ondrop="drop(event)" ondragover="allowDrop(event)"

        calendar.appendChild(dateContainer);
    });

    // Load itinerary data for each date
    loadItinerary();
}

// Fetch & display itinerary for specific dates
async function loadItinerary() {
    try {
        const itinerarySnapshot = await getDocs(collection(db, `users/${userId}/trips/${tripId}/itinerary`));
        itinerarySnapshot.forEach(doc => {
            const date = doc.id;
            const itineraryData = doc.data();
            populateDateActivities(date, itineraryData.activities || []);
        });
    } catch (error) {
        console.error("Error loading itinerary:", error);
    }
}

function populateDateActivities(date, activities) {
    const dropzone = document.querySelector(`[data-date="${date}"] .activity-dropzone`);
    dropzone.innerHTML = ""; // Clear existing activities

    activities.forEach((activity) => {
        const activityEl = createActivityCard(activity.id, activity.name, true, "calendar", date);
        dropzone.appendChild(activityEl);
    });

    // Enable reordering within the date
    enableReorderingWithinDate(dropzone);
}


function enableReorderingWithinDate(dropzone) {
    if (!window.Sortable) {
        console.error("Sortable.js is not loaded.");
        return;
    }

    const sortable = new Sortable(dropzone, {
        animation: 150,
        onEnd: async (evt) => {
            const date = evt.from.closest(".card").dataset.date;
            const updatedOrder = Array.from(evt.from.children).map((child) => ({
                id: child.dataset.activityId,
                name: child.querySelector("span").textContent,
            }));

            await updateActivitiesOrderForDate(date, updatedOrder);
        },
    });
}


async function updateActivitiesOrderForDate(date, activities) {
    try {
        const dateRef = doc(db, `users/${userId}/trips/${tripId}/itinerary`, date);
        await setDoc(dateRef, { activities });
    } catch (error) {
        console.error("Error updating activity order:", error);
    }
}

async function addActivityToDate(date, activityId) {
    try {
        const activityDoc = await getDoc(doc(db, `users/${userId}/trips/${tripId}/activities`, activityId));
        if (!activityDoc.exists()) {
            console.error("Activity not found:", activityId);
            return;
        }

        const activity = activityDoc.data();

        // Update the itinerary for the target date
        const dateRef = doc(db, `users/${userId}/trips/${tripId}/itinerary`, date);
        const dateSnapshot = await getDoc(dateRef);
        const currentActivities = dateSnapshot.exists() ? dateSnapshot.data().activities || [] : [];

        // Add activity if not already present
        if (!currentActivities.some((act) => act.id === activityId)) {
            currentActivities.push({ id: activityId, name: activity.name });
            await setDoc(dateRef, { activities: currentActivities });
        }

        // Add the activity to the Calendar UI
        const dropzone = document.querySelector(`[data-date="${date}"] .activity-dropzone`);
        const activityEl = createActivityCard(activityId, activity.name, true, "calendar", date);
        dropzone.appendChild(activityEl);

        // Remove the activity from the Saved Activities container
        const savedActivitiesContainer = document.getElementById("savedActivities");
        const savedActivity = savedActivitiesContainer.querySelector(`[data-activity-id="${activityId}"]`);
        if (savedActivity) savedActivity.remove();
    } catch (error) {
        console.error("Error adding activity to date:", error);
    }
}


async function handleDrop(event, targetDate) {
    event.preventDefault();

    const activityId = event.dataTransfer.getData("activityId");
    const source = event.dataTransfer.getData("source");

    if (activityId) {
        if (source === "calendar" && !targetDate) {
            // Move activity back to saved activities
            await removeActivityFromDate(null, activityId); // Null date signifies no specific date
        } else if (source === "calendar") {
            const sourceDate = event.dataTransfer.getData("sourceDate");
            if (sourceDate !== targetDate) {
                await moveActivityBetweenDates(activityId, sourceDate, targetDate);
            }
        } else if (source === "savedActivities") {
            await addActivityToDate(targetDate, activityId);
        }
    }
}


async function moveActivityBetweenDates(activityId, sourceDate, targetDate) {
    if (sourceDate === targetDate) return; // No action if the same date

    try {
        // Remove activity from source date
        if (sourceDate) {
            await removeActivityFromDate(sourceDate, activityId);
        }

        // Add activity to target date
        await addActivityToDate(targetDate, activityId);
    } catch (error) {
        console.error("Error moving activity:", error);
    }
}

async function removeActivityFromDate(date, activityId) {
    if (!date) return; // Guard clause

    try {
        const dateRef = doc(db, `users/${userId}/trips/${tripId}/itinerary`, date);
        const dateSnapshot = await getDoc(dateRef);

        if (dateSnapshot.exists()) {
            const activities = dateSnapshot.data().activities || [];
            const updatedActivities = activities.filter((activity) => activity.id !== activityId);

            await setDoc(dateRef, { activities: updatedActivities });

            // Refresh the calendar
            loadItinerary();
        }

        // Dynamically add the activity back to Saved Activities
        const savedActivitiesContainer = document.getElementById("savedActivities");
        if (!isActivityInSavedActivities(activityId)) {
            const activityDoc = await getDoc(doc(db, `users/${userId}/trips/${tripId}/activities`, activityId));
            if (activityDoc.exists()) {
                const activity = activityDoc.data();

                // Create the card with the remove button
                const activityEl = createActivityCard(activityId, activity.name, true, "savedActivities");

                // Remove any existing card for the same activity (if needed)
                const existingActivity = savedActivitiesContainer.querySelector(`[data-activity-id="${activityId}"]`);
                if (existingActivity) {
                    existingActivity.remove();
                }

                // Append the new card to the Saved Activities container
                savedActivitiesContainer.appendChild(activityEl);
            }
        }

    } catch (error) {
        console.error("Error removing activity from date:", error);
    }
}

// Helper function to check if an activity is already in the Saved Activities container
function isActivityInSavedActivities(activityId) {
    const savedActivitiesContainer = document.getElementById("savedActivities");
    return Array.from(savedActivitiesContainer.children).some(
        (child) => child.dataset.activityId === activityId
    );
}


function isActivityInCalendar(activityId) {
    const dropzones = document.querySelectorAll(".activity-dropzone");
    return Array.from(dropzones).some((dropzone) =>
        Array.from(dropzone.children).some((child) => child.dataset.activityId === activityId)
    );
}


function allowDrop(event) {
    event.preventDefault();
}

function drop(event) {
    event.preventDefault();

    // Extract activity and target date information
    const activityId = event.dataTransfer.getData("activityId");
    const sourceDate = event.dataTransfer.getData("sourceDate");
    const targetDate = event.target.closest(".card")?.dataset.date;

    handleDrop(event, targetDate || null);
}

function allowDrag(event, activityId, sourceDate) {
    event.dataTransfer.setData("activityId", activityId);
    event.dataTransfer.setData("sourceDate", sourceDate);
}


// Expose functions globally
window.savePlace = savePlace;
window.allowDrop = allowDrop;
window.drop = drop;
window.allowDrag = allowDrag;
window.removeActivity = removeActivity;
window.searchPlaces = searchPlaces;
window.removeActivityFromDate = removeActivityFromDate;



// function applyFilters() {
//     // Get all selected filter buttons
//     const selectedFilters = Array.from(document.querySelectorAll('.filter-btn.active'))
//         .map(button => button.getAttribute('data-category'));

//     if (selectedFilters.length === 0) {
//         // If no filters are selected, display all places
//         displayPlaces(allPlaces);
//         addMarkers(allPlaces);
//         return;
//     }

//     // Filter places based on selected categories
//     const filteredPlaces = allPlaces.filter(place =>
//         selectedFilters.some(filter => (place.types || []).includes(filter))
//     );

//     // Update the places list and map markers
//     displayPlaces(filteredPlaces);
//     addMarkers(filteredPlaces);
// }

// function clearFilters() {
//     document.querySelectorAll(".filter-btn").forEach((button) => button.classList.remove("active"));
//     displayPlaces(allPlaces); // Reset places list
//     addMarkers(allPlaces);    // Reset markers
// }

// function toggleFilter(button) {
//     button.classList.toggle("active");
// }

// // Add event listeners for filters
// document.querySelectorAll(".filter-btn").forEach((button) => {
//     button.addEventListener("click", () => toggleFilter(button));
// });

// window.applyFilters = applyFilters;
// window.clearFilters = clearFilters;
// window.toggleFilter = toggleFilter;