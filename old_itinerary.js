import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, collection, addDoc, doc, updateDoc, getDoc, deleteDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
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
let directionsService;
let directionsRenderer;
let markers = [];

let userId;

const urlParams = new URLSearchParams(window.location.search);
const tripId = urlParams.get("tripId") || localStorage.getItem("tripId");
const location = urlParams.get("location") || localStorage.getItem("location");

if (!tripId || !location) {
    console.error("Missing tripId or location. Redirecting to dashboard.");
    window.location.href = "dashboard.html";
} else {
    // Ensure values are synchronized in localStorage
    if (!localStorage.getItem("tripId")) {
        localStorage.setItem("tripId", tripId);
    }
    if (!localStorage.getItem("location")) {
        localStorage.setItem("location", location);
    }

    console.log("Trip and location loaded:", { tripId, location });
}




onAuthStateChanged(auth, (user) => {
    if (user) {
        userId = user.uid;
        localStorage.setItem("userId", userId); // Ensure userId is stored for consistent access
        console.log("User authenticated, userId:", userId);

        // Call `initItinerary` directly after authentication
        if (tripId) {
            console.log("Calling initItinerary with tripId:", tripId);
            initItinerary(tripId, userId);
        } else {
            console.error("No tripId found. Redirecting to dashboard.");
            window.location.href = "dashboard.html";
        }
    } else {
        // Redirect to login if user is not authenticated
        window.location.href = "login.html";
    }
});



async function initItinerary(tripId, userId) {
    const tripRef = doc(db, `users/${userId}/trips`, tripId);
    const tripSnapshot = await getDoc(tripRef);

    if (tripSnapshot.exists()) {
        const tripData = tripSnapshot.data();
        // const location = { lat: tripData.lat, lng: tripData.lng };

        const location = tripData.latitude && tripData.longitude
            ? { lat: tripData.latitude, lng: tripData.longitude }
            : null;

        if (location && !isNaN(location.lat) && !isNaN(location.lng)) {
            initMap(location);
        } else {
            console.error("Invalid location data. Ensure trip data includes valid latitude and longitude.");
            alert("Unable to load map due to missing location data.");
        }

        if (tripData.dates && tripData.dates.length > 0) {
            loadFullItinerary(tripData.dates);
        } else {
            console.error("Trip does not contain valid dates.");
            alert("Unable to load itinerary. Please ensure the trip has valid dates.");
        }
        

        // initMap(location);
        displayCalendar(tripData.dates);
        loadSavedActivities();
        // loadFullItinerary(tripData.dates);
        loadPlaces(location);
    } else {
        console.error("Trip data not found.");
        window.location.href = "alltrips.html";
    }
}

function initMap(location) {
    console.log("Initializing map with location:", location);
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();

    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 13,
        center: location
    });
    directionsRenderer.setMap(map);

    loadMapMarkers(location);
}

// Load and display full itinerary
async function loadFullItinerary(dates) {
    for (const date of dates) {
        const dayRef = doc(db, `users/${userId}/trips/${tripId}/itinerary`, date);
        const daySnapshot = await getDoc(dayRef);
        if (daySnapshot.exists()) {
            displayDayItinerary(date, daySnapshot.data().activities);
        }
    }
}

// Display a day's itinerary in the calendar
function displayDayItinerary(date, activities) {
    const dateContainer = document.querySelector(`.date-container[data-date="${date}"] .activity-dropzone`);
    dateContainer.innerHTML = ""; // Clear existing activities

    activities.forEach(activity => {
        const activityEl = document.createElement("div");
        activityEl.className = "activity-item";
        activityEl.textContent = activity.name;
        dateContainer.appendChild(activityEl);
    });
}

// Save daily itinerary order
async function saveDayItinerary(date, activities) {
    const dayRef = doc(db, `users/${userId}/trips/${tripId}/itinerary`, date);
    const activitiesData = activities.map(activity => ({
        id: activity.id,
        name: activity.name,
        time: activity.time || null,  // optional: add time for each activity
    }));
    await setDoc(dayRef, { activities: activitiesData });
}

function loadPlaces(location) {
    if (!location || isNaN(location.lat) || isNaN(location.lng)) {
        console.error("Invalid location provided for places search:", location);
        alert("Unable to load places. Please check the trip's location data.");
        return;
    }

    console.log("Loading places around location:", location);

    const placesService = new google.maps.places.PlacesService(document.createElement('div'));

    const request = {
        location: new google.maps.LatLng(location.lat, location.lng),
        radius: '10000',
        type: ['tourist_attraction', 'hotel', 'restaurant', 'cafe', 'bar', 'store']
    };

    placesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            displayPlaces(results);
        } else {
            console.error("Error retrieving places:", status);
            alert("Unable to retrieve places. Please try again later.");
        }
    });
}

// Display places with draggable and save options
function displayPlaces(places) {
    console.log("Displaying places:", places);

    const placesList = document.getElementById("placesList");
    placesList.innerHTML = "";

    places.forEach(place => {
        const placeEl = document.createElement("div");
        placeEl.classList.add("place-item", "card", "p-2", "m-2");
        placeEl.setAttribute("draggable", "true");
        placeEl.dataset.placeData = JSON.stringify(place);

        const photoUrl = place.photos ? place.photos[0].getUrl({ maxWidth: 400 }) : 'https://via.placeholder.com/400x300?text=No+Image';

        placeEl.innerHTML = `
            <img src="${photoUrl}" alt="${place.name}" class="card-img-top" style="width: 100%; height: auto;">
            <div class="card-body">
                <h5 class="card-title">${place.name}</h5>
                <p class="card-text">${place.vicinity || "Address not available"}</p>
                <small>Rating: ${place.rating || "N/A"} | Reviews: ${place.user_ratings_total || 0}</small>
        <button class="save-btn" onclick="savePlace('${place.place_id}', '${place.name}', '${place.vicinity}')">Save</button>
            </div>
        `;

        placeEl.addEventListener("dragstart", (event) => {
            event.dataTransfer.setData("text/plain", JSON.stringify(place));
        });

        placesList.appendChild(placeEl);
    });
}

function displayCalendar(dates) {
    const calendar = document.getElementById("calendar");
    calendar.innerHTML = "";

    dates.forEach(date => {
        const dateContainer = document.createElement("div");
        dateContainer.classList.add("date-container");
        dateContainer.dataset.date = date;

        dateContainer.innerHTML = `
            <h6>${new Date(date).toLocaleDateString()}</h6>
            <div class="activity-dropzone" ondrop="drop(event)" ondragover="allowDrop(event)"></div>
        `;

        dateContainer.addEventListener("click", () => loadActivitiesForDate(date));
        calendar.appendChild(dateContainer);
    });
}

// Allow dropping of activities into the calendar's drop zones
function allowDrop(event) {
    event.preventDefault();
}

function drag(event) {
    event.dataTransfer.setData("activityId", event.target.dataset.activityId);
}

// Handle drop event for drag-and-drop functionality
function drop(event) {
    event.preventDefault();
    const activityId = event.dataTransfer.getData("activityId");
    const date = event.target.closest(".date-container")?.dataset.date;

    if (date) {
        const activity = getActivityById(activityId);
        if (activity) {
            addActivityToDate(date, activity);
        }
    }
}

// Add activity to a specific date and save the order
function addActivityToDate(date, activity) {
    const dateContainer = document.querySelector(`.date-container[data-date="${date}"] .activity-dropzone`);
    const activityEl = document.createElement("div");
    activityEl.className = "activity-item";
    activityEl.textContent = activity.name;
    dateContainer.appendChild(activityEl);

    // Save the updated order
    const activities = Array.from(dateContainer.children).map(el => ({
        id: el.dataset.activityId,
        name: el.textContent
    }));
    saveDayItinerary(date, activities);
}

// Remove an activity from the itinerary and the database
async function removeActivity(activityId) {
    try {
        await deleteDoc(doc(db, `users/${userId}/trips/${tripId}/activities`, activityId));
        const date = document.querySelector(".date-container.active")?.dataset.date;
        loadActivitiesForDate(date);
    } catch (error) {
        console.error("Error removing activity:", error);
    }
}

async function loadSavedActivities() {
    const savedActivitiesContainer = document.getElementById("savedActivities");
    savedActivitiesContainer.innerHTML = "";

    // Fetch saved activities from Firebase
    const snapshot = await getDocs(collection(db, `users/${userId}/trips/${tripId}/activities`));
    snapshot.forEach((doc) => {
        const activity = doc.data();
        const activityId = doc.id;

        // Create a draggable element for each activity
        const activityEl = document.createElement("div");
        activityEl.classList.add("activity-item", "card", "p-2", "m-2");
        activityEl.setAttribute("draggable", "true");
        activityEl.dataset.activityId = activityId;
        activityEl.dataset.activityData = JSON.stringify(activity); // Store activity data for drag-and-drop

        activityEl.innerHTML = `
            <h6>${activity.name}</h6>
            <p>${activity.address}</p>
            <small>Rating: ${activity.rating || "N/A"} | Reviews: ${activity.reviews || 0}</small>
            <button class="remove-btn" onclick="removeActivity('${activityId}')">Remove</button>
        `;

        // Add drag event listener
        activityEl.addEventListener("dragstart", (event) => {
            event.dataTransfer.setData("text/plain", JSON.stringify(activity));
        });

        savedActivitiesContainer.appendChild(activityEl);
    });
}

// Load map markers based on places around the location
function loadMapMarkers(location) {
    const placesService = new google.maps.places.PlacesService(map);
    const request = {
        location: new google.maps.LatLng(location.lat, location.lng),
        radius: '10000',
        type: ['tourist_attraction', 'hotel', 'restaurant', 'cafe', 'bar', 'store']
    };

    placesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            displayMarkers(results);
        }
    });
}

// Display map markers for each place
function displayMarkers(places) {
    clearMarkers();

    places.forEach((place, index) => {
        const marker = new google.maps.Marker({
            position: place.geometry.location,
            map: map,
            title: place.name,
            label: `${index + 1}`
        });

        markers.push(marker);
    });
}

function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    // directionsRenderer.setDirections({ routes: [] });
}

// Save a place as an activity to the selected date in the database
async function savePlace(place) {
    const dateContainer = document.querySelector(".date-container.active");
    const date = dateContainer ? dateContainer.dataset.date : null;

    if (date) {
        try {
            await addDoc(collection(db, `users/${userId}/trips/${tripId}/activities`), {
                name: place.name,
                address: place.vicinity || placeData.formatted_address,
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                type: place.types[0],
                rating: placeData.rating || "N/A",
                reviews: placeData.user_ratings_total || 0,
                date: date
            });
            loadActivitiesForDate(date);
        } catch (error) {
            console.error("Error adding activity:", error);
        }
    } else {
        alert("Select a date to save the activity to.");
    }
}

window.allowDrop = allowDrop;
window.drop = drop;
window.savePlace = savePlace;
window.removeActivity = removeActivity;

// async function saveActivityToDate(activityData, date) {
//     try {
//         await addDoc(collection(db, `users/${userId}/trips/${tripId}/activities`), {
//             ...activityData,
//             date: date
//         });
//         loadActivitiesForDate(date);
//     } catch (error) {
//         console.error("Error saving activity:", error);
//     }
// }

// async function loadTripData() {
//     const tripRef = doc(db, `users/${userId}/trips`, tripId);
//     const tripSnapshot = await getDoc(tripRef);

//     if (tripSnapshot.exists()) {
//         const tripData = tripSnapshot.data();
//         displayCalendar(tripData.dates);
//         loadPlaces(tripData.location);
//         loadSavedActivities();
//     } else {
//         console.error("Trip not found.");
//         window.location.href = "alltrips.html";
//     }
// }

// Calendar dates with droppable zones for activities


// async function loadMapMarkers() {
//     const snapshot = await getDocs(collection(db, `users/${userId}/trips/${tripId}/activities`));
//     snapshot.forEach((doc) => {
//         const activity = doc.data();
//         const marker = new google.maps.Marker({
//             position: { lat: activity.lat, lng: activity.lng },
//             map,
//             title: activity.name
//         });

//         const infowindow = new google.maps.InfoWindow({
//             content: `<h5>${activity.name}</h5><p>${activity.address}</p><small>Type: ${activity.type}</small>`
//         });

//         marker.addListener("click", () => {
//             infowindow.open(map, marker);
//         });

//         markers.push(marker);
//     });
// }



// Load activities for the selected date and update map markers
// async function loadActivitiesForDate(date) {
//     clearMarkers();
//     const activitiesSnapshot = await getDocs(collection(db, `users/${userId}/trips/${tripId}/activities`));
//     const activities = [];

//     activitiesSnapshot.forEach(doc => {
//         const activity = doc.data();
//         if (activity.date === date) {
//             activities.push({ ...activity, id: doc.id });
//         }
//     });

//     displayMarkers(activities);
// }

// // Display markers and connect them with a route on the map
// function displayMarkers(activities) {
//     const waypoints = [];

//     activities.forEach((activity, index) => {
//         const position = { lat: activity.lat, lng: activity.lng };
//         const marker = new google.maps.Marker({
//             position,
//             label: `${index + 1}`,
//             map,
//             title: activity.name
//         });

//         markers.push(marker);

//         // Collect waypoints for the route
//         if (index > 0) {
//             waypoints.push({
//                 location: position,
//                 stopover: true
//             });
//         }
//     });

//     // Show route connecting all activities in order
//     if (activities.length > 1) {
//         const origin = { lat: activities[0].lat, lng: activities[0].lng };
//         const destination = { lat: activities[activities.length - 1].lat, lng: activities[activities.length - 1].lng };

//         directionsService.route(
//             {
//                 origin,
//                 destination,
//                 waypoints,
//                 travelMode: google.maps.TravelMode.DRIVING
//             },
//             (response, status) => {
//                 if (status === google.maps.DirectionsStatus.OK) {
//                     directionsRenderer.setDirections(response);
//                 } else {
//                     console.error("Directions request failed due to ", status);
//                 }
//             }
//         );
//     }
// }

// // Clear previous markers and route
// function clearMarkers() {
//     markers.forEach(marker => marker.setMap(null));
//     markers = [];
//     directionsRenderer.setDirections({ routes: [] });
// }

// // Firebase functions to save and remove activities
// async function savePlace(place) {
//     const date = document.querySelector(".date-container.active")?.dataset.date;

//     if (date) {
//         try {
//             await addDoc(collection(db, `users/${userId}/trips/${tripId}/activities`), {
//                 name: place.name,
//                 address: place.vicinity,
//                 lat: place.geometry.location.lat(),
//                 lng: place.geometry.location.lng(),
//                 type: place.types[0],
//                 date: date
//             });
//             loadActivitiesForDate(date);
//         } catch (error) {
//             console.error("Error adding activity:", error);
//         }
//     } else {
//         alert("Select a date to save the activity to.");
//     }
// }

// function initCalendar() {
//     const calendarEl = document.getElementById("calendar");
//     const calendar = new FullCalendar.Calendar(calendarEl, {
//         initialView: "dayGridMonth",
//         editable: true,
//         droppable: true,
//         events: [],

//         // When an activity is dropped on the calendar
//         drop: (info) => {
//             const activityData = JSON.parse(info.draggedEl.dataset.activityData);
//             calendar.addEvent({
//                 title: activityData.name,
//                 start: info.date,
//                 extendedProps: {
//                     activityId: activityData.id,
//                     type: activityData.type,
//                     address: activityData.address
//                 }
//             });

//             // Save the activity date to Firebase (update itinerary)
//             saveActivityToItinerary(activityData, info.date);
//         }
//     });
//     calendar.render();
// }

// async function saveActivityToItinerary(activity, date) {
//     try {
//         // Save updated activity data to Firebase under the itinerary date
//         const itineraryRef = doc(db, `users/${userId}/trips/${tripId}/itinerary`, activity.id);
//         await setDoc(itineraryRef, {
//             ...activity,
//             scheduledDate: date.toISOString().split("T")[0] // Format as YYYY-MM-DD
//         });
//         console.log("Activity added to itinerary.");
//     } catch (error) {
//         console.error("Error saving to itinerary:", error);
//     }
// }

// function filterMarkers(type) {
//     markers.forEach(marker => {
//         if (marker.getTitle().toLowerCase().includes(type.toLowerCase())) {
//             marker.setMap(map);
//         } else {
//             marker.setMap(null);
//         }
//     });
// }

// let selectedFilters = [];

// function applyFilters() {
//     const filteredActivities = activityList.filter(activity => selectedFilters.includes(activity.type));
//     displayActivityList(filteredActivities);
//     filterMarkers(selectedFilters);
// }

// function clearFilters() {
//     selectedFilters = [];
//     displayActivityList(activityList);
//     filterMarkers([]);
// }

// function displayActivityList(activities) {
//     const activityListContainer = document.getElementById("activityList");
//     activityListContainer.innerHTML = "";

//     activities.forEach(activity => {
//         const card = document.createElement("div");
//         card.classList.add("card", "col-md-3", "m-2");
//         card.innerHTML = `
//             <div class="card-body">
//                 <h5 class="card-title">${activity.name}</h5>
//                 <p class="card-text">${activity.address}</p>
//                 <small>Rating: ${activity.rating || "N/A"} | Reviews: ${activity.reviews || 0}</small>
//             </div>
//         `;
//         activityListContainer.appendChild(card);
//     });
// }

// // Display saved activities on map
// async function loadActivities() {
//     const savedActivitiesRef = collection(db, "savedActivities");
//     const querySnapshot = await getDocs(savedActivitiesRef);

//     const bounds = new google.maps.LatLngBounds();

//     querySnapshot.forEach(docSnapshot => {
//         const activity = docSnapshot.data();

//         const lat = parseFloat(activity.lat);
//         const lng = parseFloat(activity.lng);
//         if (!isNaN(lat) && !isNaN(lng)) {
//             displayActivity(activity, docSnapshot.id);  // Render each activity

//             // Add marker to the map
//             const marker = new google.maps.Marker({
//                 position: { lat: lat, lng: lng },  // Ensure these are numbers
//                 map: map,
//                 title: activity.name
//             });

//             bounds.extend({ lat: lat, lng: lng });
//         } else {
//             console.error(`Invalid lat/lng for activity: ${activity.name}`);
//         }
//     });

//     // Adjust the map to fit all markers
//     map.fitBounds(bounds);
// }

// function displayActivity(activity, id) {
//     const activityCard = document.createElement('div');
//     activityCard.classList.add('col-md-4', 'activity-card');

//     activityCard.innerHTML = `
//       <h5>${activity.name}</h5>
//       <p>Address: ${activity.address}</p>
//       <button class="btn btn-danger" onclick="removeActivity('${id}')">Remove</button>
//     `;

//     activitiesContainer.appendChild(activityCard);
// }

// // Remove activity from Firestore and update the list
// async function removeActivity(id) {
//     try {
//         await deleteDoc(doc(db, "savedActivities", id));
//         location.reload();  // Reload the page to refresh the list of activities and map
//     } catch (error) {
//         console.error("Error removing document: ", error);
//     }
// }

// window.onload = initMap;
// window.removeActivity = removeActivity;
