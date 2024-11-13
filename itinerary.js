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

// Fetch weather data
async function fetchWeather(lat, lon) {
    const weatherUrl = "https://api.openweathermap.org/data/3.0/onecall";
    const apiKey = "a4ab09f5d4573bbd4b5318a5292eae23";

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
        const response = await axios.get(weatherUrl, { params });
        const data = response.data;

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
        radius: "30000",
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
        radius: "30000",
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


function displayPlaces(places) {
    const placesList = document.getElementById("placesList");

    // Clear the existing content
    while (placesList.firstChild) {
        placesList.removeChild(placesList.firstChild);
    }

    places.forEach((place) => {
        const photoUrl = place.photos
            ? place.photos[0].getUrl({ maxWidth: 100 })
            : "https://via.placeholder.com/100x100?text=No+Image";

        const placeWrapper = document.createElement("div");
        placeWrapper.classList.add("place-wrapper", "mb-3");

        const placeItem = document.createElement("div");
        placeItem.classList.add("place-item");

        const row = document.createElement("div");
        row.classList.add("row");

        const colImage = document.createElement("div");
        colImage.classList.add("col-3");

        const image = document.createElement("img");
        image.classList.add("img-fluid");
        image.setAttribute("src", photoUrl);
        image.setAttribute("alt", place.name);

        colImage.appendChild(image);

        const colDetails = document.createElement("div");
        colDetails.classList.add("col-9");

        const name = document.createElement("h5");
        name.textContent = place.name;

        const vicinity = document.createElement("p");
        vicinity.textContent = place.vicinity || "No address available";

        const rating = document.createElement("p");
        rating.textContent = `Rating: ${place.rating || "N/A"} (${place.user_ratings_total || 0} reviews)`;

        colDetails.append(name, vicinity, rating);

        row.append(colImage, colDetails);
        placeItem.appendChild(row);

        const saveButton = document.createElement("button");
        saveButton.classList.add("save-button", "btn", "btn-primary");
        saveButton.textContent = "Save";
        saveButton.addEventListener("click", (event) => {
            event.stopPropagation();
            savePlace(place.place_id, place.name, event);
        });

        placeWrapper.append(placeItem, saveButton);

        placeItem.addEventListener("click", () => {
            displayPlaceDetails(place.place_id);
        });

        placesList.appendChild(placeWrapper);
    });
}


async function displayPlaceDetails(placeId) {
    const placesService = new google.maps.places.PlacesService(map);

    placesService.getDetails({ placeId }, async (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            const placesListContainer = document.getElementById("placesList");

            // Clear existing content
            while (placesListContainer.firstChild) {
                placesListContainer.removeChild(placesListContainer.firstChild);
            }

            const backButton = document.createElement("button");
            backButton.id = "backToList";
            backButton.classList.add("btn", "btn-secondary", "mb-3");
            backButton.textContent = "Back to List";
            backButton.addEventListener("click", () => {
                if (currentSearchQuery && currentSearchResults.length > 0) {
                    displayPlaces(currentSearchResults);
                    addMarkers(currentSearchResults);
                } else {
                    displayPlaces(allPlaces);
                    addMarkers(allPlaces);
                }

                document.getElementById("searchInput").value = currentSearchQuery;
            });

            placesListContainer.appendChild(backButton);

            if (place.photos && place.photos.length > 0) {
                const carousel = createCarousel(place.photos.slice(0, 5));
                placesListContainer.appendChild(carousel);
            } else {
                const noPhotos = document.createElement("p");
                noPhotos.textContent = "No photos available for this location.";
                placesListContainer.appendChild(noPhotos);
            }

            const details = [
                { label: "Rating", value: `${place.rating || "N/A"} (${place.user_ratings_total || 0} reviews)` },
                { label: "Address", value: place.formatted_address || "Not available" },
                { label: "Phone", value: place.formatted_phone_number || "Not available" },
                { label: "Website", value: place.website || "Not available" },
            ];

            details.forEach((detail) => {
                const detailElement = document.createElement("p");

                const strong = document.createElement("strong");
                strong.textContent = `${detail.label}: `;

                const span = document.createElement("span");
                span.textContent = detail.value;

                detailElement.appendChild(strong);
                detailElement.appendChild(span);
                placesListContainer.appendChild(detailElement);
            });

            // Opening Hours
            if (place.opening_hours?.weekday_text) {
                const openingHoursTitle = document.createElement("p");
                const strong = document.createElement("strong");
                strong.textContent = "Opening Hours:";
                openingHoursTitle.appendChild(strong);
                placesListContainer.appendChild(openingHoursTitle);

                place.opening_hours.weekday_text.forEach((dayText) => {
                    const dayElement = document.createElement("p");
                    dayElement.textContent = dayText;
                    placesListContainer.appendChild(dayElement);
                });
            } else {
                const noOpeningHours = document.createElement("p");
                noOpeningHours.textContent = "Opening Hours: Not available";
                placesListContainer.appendChild(noOpeningHours);
            }

            // Fetch and display description using Wikipedia API
            const descriptionTitle = document.createElement("p");
            const strongDescription = document.createElement("strong");
            strongDescription.textContent = "Description:";
            descriptionTitle.appendChild(strongDescription);
            placesListContainer.appendChild(descriptionTitle);

            const description = await fetchWikipediaDescription(place.name);
            description.forEach((paragraph) => {
                const paragraphElement = document.createElement("p");
                paragraphElement.textContent = paragraph;
                placesListContainer.appendChild(paragraphElement);
            });

            highlightMarker(place.geometry.location);
        } else {
            console.error("Error fetching place details:", status);
        }
    });
}


async function fetchWikipediaDescription(query) {
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts&exintro=true&explaintext=true&titles=${encodeURIComponent(
        query
    )}`;

    try {
        const response = await fetch(wikiUrl);
        const data = await response.json();
        const pages = data.query.pages;
        const page = Object.values(pages)[0]; // Get the first result

        if (page && page.extract) {
            return formatDescription(page.extract);
        } else {
            console.warn("No Wikipedia description found for:", query);
            return ["No description available."];
        }
    } catch (error) {
        console.error("Error fetching Wikipedia description:", error);
        return ["Failed to fetch description."];
    }
}

function formatDescription(description) {
    const maxLength = 200; // Character limit per paragraph
    const sentences = description.split(". "); // Split description into sentences
    const paragraphs = [];
    let currentParagraph = "";

    sentences.forEach((sentence) => {
        if ((currentParagraph + sentence).length <= maxLength) {
            currentParagraph += sentence + ". ";
        } else {
            paragraphs.push(currentParagraph.trim());
            currentParagraph = sentence + ". ";
        }
    });

    // Add any remaining content as the last paragraph
    if (currentParagraph.trim().length > 0) {
        paragraphs.push(currentParagraph.trim());
    }

    return paragraphs;
}



function createCarousel(photos) {
    const carousel = document.createElement("div");
    carousel.id = "placePhotosCarousel";
    carousel.classList.add("carousel", "slide");
    carousel.setAttribute("data-bs-ride", "carousel");

    const carouselInner = document.createElement("div");
    carouselInner.classList.add("carousel-inner");

    photos.forEach((photo, index) => {
        const carouselItem = document.createElement("div");
        carouselItem.classList.add("carousel-item");
        if (index === 0) {
            carouselItem.classList.add("active");
        }

        const img = document.createElement("img");
        img.src = photo.getUrl({ maxWidth: 800 });
        img.classList.add("d-block", "w-100");
        img.alt = `Photo ${index + 1}`;

        carouselItem.appendChild(img);
        carouselInner.appendChild(carouselItem);
    });

    carousel.appendChild(carouselInner);

    const prevButton = document.createElement("button");
    prevButton.classList.add("carousel-control-prev");
    prevButton.setAttribute("data-bs-target", "#placePhotosCarousel");
    prevButton.setAttribute("data-bs-slide", "prev");

    const prevIcon = document.createElement("span");
    prevIcon.classList.add("carousel-control-prev-icon");
    prevIcon.setAttribute("aria-hidden", "true");

    const prevText = document.createElement("span");
    prevText.classList.add("visually-hidden");
    prevText.textContent = "Previous";

    prevButton.appendChild(prevIcon);
    prevButton.appendChild(prevText);

    const nextButton = document.createElement("button");
    nextButton.classList.add("carousel-control-next");
    nextButton.setAttribute("data-bs-target", "#placePhotosCarousel");
    nextButton.setAttribute("data-bs-slide", "next");

    const nextIcon = document.createElement("span");
    nextIcon.classList.add("carousel-control-next-icon");
    nextIcon.setAttribute("aria-hidden", "true");

    const nextText = document.createElement("span");
    nextText.classList.add("visually-hidden");
    nextText.textContent = "Next";

    nextButton.appendChild(nextIcon);
    nextButton.appendChild(nextText);

    carousel.appendChild(prevButton);
    carousel.appendChild(nextButton);

    return carousel;
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

    const service = new google.maps.places.PlacesService(map);

    service.getDetails({ placeId }, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {

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

    // Clear existing content
    while (savedActivitiesContainer.firstChild) {
        savedActivitiesContainer.removeChild(savedActivitiesContainer.firstChild);
    }


    try {
        const snapshot = await getDocs(collection(db, `users/${userId}/trips/${tripId}/activities`));
        snapshot.forEach((doc) => {
            const activity = doc.data();
            const activityId = doc.id;

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
    activityEl.classList.add("card", "p-2", "m-2");
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

    // Create a row container for name and icon
    const activityRow = document.createElement("div");
    activityRow.classList.add("d-flex", "justify-content-between", "align-items-center");

    // Add the activity name
    const nameEl = document.createElement("span");
    nameEl.textContent = name;
    nameEl.classList.add("activity-name"); // Optional: Class for additional styling
    nameEl.style.margin = "0"; // No extra margin
    activityRow.appendChild(nameEl);

    // If removable, add the remove icon
    if (isRemovable) {
        const removeIcon = document.createElement("img");
        removeIcon.src = "./imgs/trash-icon.png"; // Path to the trash icon image
        removeIcon.alt = "Remove";
        removeIcon.style.width = "23px"; // Set icon width
        removeIcon.style.height = "23px"; // Set icon height
        removeIcon.style.cursor = "pointer"; // Make it clear the icon is clickable

        // Add the click event listener for removing the activity
        if (source === "calendar") {
            removeIcon.addEventListener("click", () => removeActivityFromDate(date, activityId));
        } else {
            removeIcon.addEventListener("click", () => removeActivity(activityId));
        }

        activityRow.appendChild(removeIcon);
    }

    // Append the row to the activity card
    activityEl.appendChild(activityRow);

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

    } catch (error) {
        console.error(`Error removing activity ${activityId}:`, error);
    }
}

async function displayCalendar(dates) {
    const calendar = document.getElementById("calendar");

    // Clear existing content
    while (calendar.firstChild) {
        calendar.removeChild(calendar.firstChild);
    }

    for (const date of dates) {
        const weatherDataForDate = weatherData[date]; // Use pre-fetched weather data

        // Create the date container
        const dateContainer = document.createElement("div");
        dateContainer.classList.add("card", "p-3", "mb-3");
        dateContainer.dataset.date = date;

        // Add drag-and-drop event listeners to the date container
        dateContainer.addEventListener("dragover", (event) => event.preventDefault());
        dateContainer.addEventListener("drop", (event) => handleDrop(event, date));

        // Create a row for the date and weather
        const dateWeatherRow = document.createElement("div");
        dateWeatherRow.classList.add("d-flex", "justify-content-between", "align-items-center", "mb-2");

        // Add the date as a header
        const dateHeader = document.createElement("h6");
        dateHeader.textContent = new Date(date).toLocaleDateString();
        dateHeader.style.margin = "0"; // Ensure no extra margin
        dateWeatherRow.appendChild(dateHeader);

        // Add weather details if available
        if (weatherDataForDate) {
            const weatherDetails = document.createElement("div");
            weatherDetails.classList.add("weather-details", "d-flex", "align-items-center");

            const weatherIcon = document.createElement("img");
            weatherIcon.src = `http://openweathermap.org/img/wn/${weatherDataForDate.icon}@2x.png`;
            weatherIcon.alt = weatherDataForDate.description;
            weatherIcon.classList.add("weather-icon");
            weatherIcon.style.width = "20px"; // Adjust icon size
            weatherIcon.style.height = "20px";
            weatherIcon.style.marginRight = "5px"; // Add spacing between icon and temperature

            const tempSpan = document.createElement("span");
            tempSpan.classList.add("high-low-temp");
            tempSpan.textContent = `H: ${weatherDataForDate.highTemp}°C L: ${weatherDataForDate.lowTemp}°C`;
            tempSpan.style.fontSize = "0.9rem";
            tempSpan.style.fontWeight = "bold";

            weatherDetails.appendChild(weatherIcon);
            weatherDetails.appendChild(tempSpan);

            dateWeatherRow.appendChild(weatherDetails);
        } else {
            const noWeather = document.createElement("p");
            noWeather.textContent = "No weather data";
            noWeather.style.margin = "0";
            dateWeatherRow.appendChild(noWeather);
        }

        // Append the date and weather row to the date container
        dateContainer.appendChild(dateWeatherRow);

        // Add the activity dropzone
        const dropzone = document.createElement("div");
        dropzone.classList.add("activity-dropzone");
        dropzone.addEventListener("dragover", (event) => event.preventDefault()); // Enable drop
        dropzone.addEventListener("drop", (event) => handleDrop(event, date)); // Handle drop
        dateContainer.appendChild(dropzone);

        // Append the date container to the calendar
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

    // Clear existing activities
    while (dropzone.firstChild) {
        dropzone.removeChild(dropzone.firstChild);
    }

    // Add activities to the dropzone
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


// Function fetchPlaceAndAddMarker is retained for missing markers
async function fetchPlaceAndAddMarker(placeId, name) {
    const service = new google.maps.places.PlacesService(map);

    return new Promise((resolve, reject) => {
        service.getDetails({ placeId }, (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
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

