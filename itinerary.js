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
let selectedMarker = null;

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

        populateTripDropdown();
        initItinerary();
    } else {
        window.location.href = "login.html";
    }
});

// Initialise itinerary
async function initItinerary() {
    try {
        const tripSnapshot = await getDocs(collection(db, `users/${userId}/trips`));
        const tripData = tripSnapshot.docs.find((doc) => doc.id === tripId)?.data();

        if (!tripData) {
            console.error("Trip not found.");
            window.location.href = "dashboard.html";
            return;
        }

        const { name, location, latitude, longitude, dates } = tripData;

        if (!latitude || !longitude) {
            console.error("Latitude or Longitude is missing in tripData:", tripData);
            return;
        }

        // Update the header with trip info
        document.getElementById("trip-name").textContent = name;
        document.getElementById("trip-location").textContent = location;

        tripDates = dates;
        const locationCoords = { lat: latitude, lng: longitude };

        await fetchWeather(latitude, longitude);
        initMap(locationCoords);
        displayCalendar(dates);
        loadPlaces(locationCoords);
        loadSavedActivities();
        loadItinerary();
    } catch (error) {
        console.error("Error initializing itinerary:", error);
    }
}

async function populateTripDropdown() {
    try {
        const tripSelector = document.getElementById("tripSelector");
        tripSelector.innerHTML = '<option value="" disabled selected>Select a Trip</option>';

        const tripSnapshot = await getDocs(collection(db, `users/${userId}/trips`));
        tripSnapshot.forEach((doc) => {
            const tripData = doc.data();
            tripSelector.innerHTML += `<option value="${doc.id}">${tripData.name} (${tripData.location})</option>`;
        });

        // Add event listener for dropdown change
        tripSelector.addEventListener("change", async (event) => {
            tripId = event.target.value;
            localStorage.setItem("tripId", tripId);

            const tripDoc = await getDoc(doc(db, `users/${userId}/trips/${tripId}`));
            const tripData = tripDoc.data();

            document.getElementById("trip-name").textContent = tripData.name;
            document.getElementById("trip-location").textContent = tripData.location;

            // Update the dashboard link dynamically
            const dashboardLink = document.querySelector('a[href*="dashboard.html"]');
            if (dashboardLink) {
                dashboardLink.href = `dashboard.html?tripId=${tripId}&location=${encodeURIComponent(tripData.location)}`;
            }

            // Reinitialize itinerary with the new trip
            await initItinerary();
        });
    } catch (error) {
        console.error("Error populating trip dropdown:", error);
    }
}

// Fetch weather data
async function fetchWeather(lat, lon) {
    const weatherUrl = "https://api.openweathermap.org/data/3.0/onecall";
    const apiKey = "4e1a69304c74566a0ebcf18acbafbc18";

    if (!lat || !lon) {
        console.error("Latitude or Longitude is missing. Cannot fetch weather data.");
        return;
    }

    const params = {
        lat: lat,
        lon: lon,
        appid: apiKey,
        units: "metric",
        exclude: "minutely,hourly"
    };

    try {
        console.log("Fetching weather data with params:", params);
        const response = await axios.get(weatherUrl, { params });
        const data = response.data;

        console.log("Weather data fetched successfully:", data);

        weatherData = data.daily.reduce((acc, day) => {
            const date = new Date(day.dt * 1000).toISOString().split("T")[0];
            acc[date] = {
                highTemp: day.temp.max.toFixed(1),
                lowTemp: day.temp.min.toFixed(1),
                icon: day.weather[0].icon,
                description: day.weather[0].description,
            };
            return acc;
        }, {});
    } catch (error) {
        console.error("Error fetching weather data:", error.message);
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", error.response.data);
        }
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
    placesList.innerHTML = "";

    places.forEach((place) => {
        const photoUrl = place.photos
            ? place.photos[0].getUrl({ maxWidth: 100 })
            : "https://via.placeholder.com/100x100?text=No+Image";

        const placeEl = document.createElement("div");
        placeEl.classList.add("place-wrapper", "mb-3");

        // Card structure
        placeEl.innerHTML = `
            <div class="place-item">
                <div class="row">
                    <div class="col-3">
                        <img src="${photoUrl}" alt="${place.name}" class="img-fluid">
                    </div>
                    <div class="col-9">
                        <h5>${place.name}</h5>
                        <p>${place.vicinity || "No address available"}</p>
                        <p>Rating: ${place.rating || "N/A"} (${place.user_ratings_total || 0} reviews)</p>
                    </div>
                </div>
            </div>
            <button 
                class="save-button btn btn-primary" 
                onclick="savePlace('${place.place_id}', '${place.name}', event)"
            >
                Save
            </button>
        `;

        // Event listener for navigating to Place Details (attached to the card, excluding the Save button)
        placeEl.querySelector(".place-item").addEventListener("click", () => {
            displayPlaceDetails(place.place_id);
        });

        placesList.appendChild(placeEl);
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

async function fetchMissingPlace(placeId) {
    console.log("Fetching place details for placeId:", placeId);

    const service = new google.maps.places.PlacesService(map);

    service.getDetails({ placeId }, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            console.log("Fetched missing place:", place);

            // Only add the marker, no need to highlight it
            addMarkers([place]);
        } else if (status === google.maps.places.PlacesServiceStatus.INVALID_REQUEST) {
            console.error(`Invalid 'placeId': ${placeId}. Skipping this activity.`);
        } else {
            console.error(`Error fetching place details for placeId ${placeId}:`, status);
        }
    });
}


// Function for adding markers directly based on activities remains unchanged
function addMarkers(places) {
    clearMarkers();

    places.forEach((place) => {
        const location = place.geometry?.location;

        if (location && !isNaN(location.lat()) && !isNaN(location.lng())) {
            const marker = new google.maps.Marker({
                position: location,
                map: map,
                title: place.place_id, // Use place ID as the marker title
            });

            markers.push(marker); // Add marker to the markers array
            marker.addListener("click", () => {
                if (selectedMarker) selectedMarker.setIcon(null);
                marker.setIcon("http://maps.google.com/mapfiles/ms/icons/green-dot.png");
                selectedMarker = marker;
                map.setCenter(marker.getPosition());
            });
        } else {
            console.warn(`Invalid marker position for place: ${place.name}`);
        }
    });

    console.log("Markers added:", markers.map((m) => m.title)); // Log all marker titles (place IDs)
}

function clearMarkers() {
    markers.forEach((marker) => marker.setMap(null));
    markers = [];

    // Reset selectedMarker safely
    if (selectedMarker) {
        selectedMarker.setMap(null);
        selectedMarker = null;
    }
}


// Ensure markers persist across general map updates
function updateMapMarkers(places) {
    clearMarkers();

    places.forEach((place) => {
        const marker = new google.maps.Marker({
            position: { lat: place.lat, lng: place.lng },
            map: map,
            title: place.name,
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

            console.log("Saved activity loaded:", { id: activityId, name: activity.name, placeId: activity.placeId });

            if (!isActivityInCalendar(activityId)) {
                const activityEl = createActivityCard(activityId, activity.name, true, "savedActivities");
                savedActivitiesContainer.appendChild(activityEl);
            }
        });
    } catch (error) {
        console.error("Error loading saved activities:", error);
    }
}


// async function loadSavedActivities() {
//     const savedActivitiesContainer = document.getElementById("savedActivities");
//     savedActivitiesContainer.innerHTML = "";

//     try {
//         const snapshot = await getDocs(collection(db, `users/${userId}/trips/${tripId}/activities`));
//         snapshot.forEach((doc) => {
//             const activity = doc.data();
//             const activityId = doc.id;

//             console.log("Saved activity loaded:", { id: activityId, name: activity.name });

//             // // Check if the activity already has a marker
//             // const markerExists = markers.some(marker => marker.title === activityId);

//             // if (!markerExists) {
//             //     console.warn(`Marker for activity ID ${activityId} not found. Fetching place details.`);
//             //     fetchMissingPlace(activityId); // Fetch marker for missing place
//             // }

//             // Only display activities not already in the calendar
//             if (!isActivityInCalendar(activityId)) {
//                 const activityEl = createActivityCard(activityId, activity.name, true, "savedActivities");
//                 savedActivitiesContainer.appendChild(activityEl);
//             }
//         });
//     } catch (error) {
//         console.error("Error loading saved activities:", error);
//     }
// }


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

function savePlace(placeId, name, event) {
    event.stopPropagation(); // Prevent click propagation

    if (!placeId) {
        console.error(`Cannot save place without placeId for ${name}`);
        return;
    }

    const activity = { id: placeId, name, placeId };
    addDoc(collection(db, `users/${userId}/trips/${tripId}/activities`), activity)
        .then(() => {
            console.log(`Place saved: ${name} with placeId: ${placeId}`);
            loadSavedActivities(); // Refresh saved activities
        })
        .catch(error => console.error("Error saving place:", error));
}


async function updateActivitiesWithPlaceId() {
    const activitiesRef = collection(db, `users/${userId}/trips/${tripId}/activities`);
    const snapshot = await getDocs(activitiesRef);
    const placesService = new google.maps.places.PlacesService(map);

    for (const doc of snapshot.docs) {
        const activity = doc.data();
        if (!activity.placeId) {
            console.warn(`Updating activity without placeId: ${activity.name}`);
            const request = { query: activity.name, fields: ["place_id"] };

            placesService.textSearch(request, async (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
                    const placeId = results[0].place_id;
                    console.log(`Found placeId for ${activity.name}: ${placeId}`);
                    await updateDoc(doc.ref, { placeId });
                } else {
                    console.error(`Failed to fetch placeId for activity: ${activity.name}`);
                }
            });
        }
    }
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


// Event listener removed from calendar dates (for filtering markers)
async function displayCalendar(dates) {
    const calendar = document.getElementById("calendar");
    calendar.innerHTML = "";

    for (const date of dates) {
        const weatherDataForDate = weatherData[date]; // Use pre-fetched weather data

        // Build weather display if data exists
        const weatherDisplay = weatherDataForDate
            ? `
                <div class="weather-details">
                    <img 
                        src="http://openweathermap.org/img/wn/${weatherDataForDate.icon}@2x.png" 
                        alt="${weatherDataForDate.description}" 
                        class="weather-icon" 
                    />
                    <span class="high-low-temp">
                        H: ${weatherDataForDate.highTemp}°C L: ${weatherDataForDate.lowTemp}°C
                    </span>
                </div>
              `
            : `<p>No weather data</p>`;

        const dateContainer = document.createElement("div");
        dateContainer.classList.add("card", "p-3", "mb-3");
        dateContainer.dataset.date = date;

        // Allow dragover and drop
        dateContainer.addEventListener("dragover", (event) => event.preventDefault());
        dateContainer.addEventListener("drop", (event) => handleDrop(event, date));

        dateContainer.innerHTML = `
            <h6>${new Date(date).toLocaleDateString()}</h6>
            ${weatherDisplay}
            <div class="activity-dropzone"></div>
        `;

        calendar.appendChild(dateContainer);
    }

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

    // Add click listener to filter markers and show route
    // const dateCard = document.querySelector(`[data-date="${date}"]`);
    // dateCard.addEventListener("click", () => {
    //     console.log("Activities for date:", date, activities);
    //     filterMarkersByDate(date, activities);
    // });

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


// Function fetchPlaceAndAddMarker is retained for missing markers
async function fetchPlaceAndAddMarker(placeId, name) {
    const service = new google.maps.places.PlacesService(map);

    return new Promise((resolve, reject) => {
        service.getDetails({ placeId }, (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                console.log(`Fetched details for place: ${place.name}`);
                addMarkers([place]); // Add marker to the map
                resolve(place);
            } else {
                console.error(`Error fetching place details for ${name || placeId}:`, status);
                reject(`Error fetching place details: ${status}`);
            }
        });
    });
}



let directionsService = new google.maps.DirectionsService();
let directionsRenderer = new google.maps.DirectionsRenderer();




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


// function drawRoute(markers) {
//     const waypoints = markers.slice(1, -1).map(marker => ({
//         location: marker.getPosition(),
//         stopover: true,
//     }));

//     const request = {
//         origin: markers[0].getPosition(),
//         destination: markers[markers.length - 1].getPosition(),
//         waypoints: waypoints,
//         travelMode: google.maps.TravelMode.DRIVING, // Change travel mode as needed
//     };

//     directionsService.route(request, (result, status) => {
//         if (status === google.maps.DirectionsStatus.OK) {
//             directionsRenderer.setDirections(result);
//             directionsRenderer.setMap(map);
//         } else {
//             console.error("Directions request failed:", status);
//         }
//     });
// }

// function clearRoute() {
//     directionsRenderer.setMap(null);
// }

// async function filterMarkersByDate(date, activities) {
//     console.log(`Filtering markers for date: ${date} with activities:`, activities);

//     markers.forEach(marker => marker.setMap(null)); // Clear all existing markers on the map

//     const filteredMarkers = [];
//     for (const [index, activity] of activities.entries()) {
//         const { placeId, name, id } = activity;

//         if (!placeId) {
//             console.warn(`Missing placeId for activity:`, activity);
//             continue; // Skip activities without a placeId
//         }

//         let marker = markers.find(marker => marker.title === placeId);

//         if (!marker) {
//             console.warn(`Marker not found for placeId: ${placeId}, fetching details for activity: ${name}`);
//             try {
//                 const place = await fetchPlaceAndAddMarker(placeId, name);
//                 marker = markers.find(marker => marker.title === place.place_id);
//             } catch (error) {
//                 console.error(`Failed to fetch details for placeId: ${placeId}`, error);
//                 continue;
//             }
//         }

//         if (marker) {
//             marker.setLabel((index + 1).toString()); // Order markers with labels
//             marker.setMap(map);
//             filteredMarkers.push(marker);
//         }
//     }

//     if (filteredMarkers.length > 1) {
//         drawRoute(filteredMarkers); // Connect the markers with a route
//     } else {
//         clearRoute(); // Clear route if fewer than two markers
//     }
// }

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