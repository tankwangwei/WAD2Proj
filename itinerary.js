import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

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

const activitiesContainer = document.getElementById('activitiesContainer');
let map;


async function initMap() {
    const singaporeCenter = { lat: 1.3521, lng: 103.8198 };  // default center
    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    map = new Map(document.getElementById("map"), {
        zoom: 14,
        center: singaporeCenter,
    });

    loadActivities();
}

// Show saved activities
async function savedActivities() {
    const savedActivitiesRef = collection(db, "savedActivities");
    const querySnapshot = await getDocs(savedActivitiesRef);

}

// Display saved activities on map
async function loadActivities() {
    const savedActivitiesRef = collection(db, "savedActivities");
    const querySnapshot = await getDocs(savedActivitiesRef);

    const bounds = new google.maps.LatLngBounds();

    querySnapshot.forEach(docSnapshot => {
        const activity = docSnapshot.data();

        const lat = parseFloat(activity.lat);
        const lng = parseFloat(activity.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
            displayActivity(activity, docSnapshot.id);  // Render each activity

            // Add marker to the map
            const marker = new google.maps.Marker({
                position: { lat: lat, lng: lng },  // Ensure these are numbers
                map: map,
                title: activity.name
            });

            bounds.extend({ lat: lat, lng: lng });
        } else {
            console.error(`Invalid lat/lng for activity: ${activity.name}`);
        }
    });

    // Adjust the map to fit all markers
    map.fitBounds(bounds);
}

function displayActivity(activity, id) {
    const activityCard = document.createElement('div');
    activityCard.classList.add('col-md-4', 'activity-card');

    activityCard.innerHTML = `
      <h5>${activity.name}</h5>
      <p>Address: ${activity.address}</p>
      <button class="btn btn-danger" onclick="removeActivity('${id}')">Remove</button>
    `;

    activitiesContainer.appendChild(activityCard);
}

// Remove activity from Firestore and update the list
async function removeActivity(id) {
    try {
        await deleteDoc(doc(db, "savedActivities", id));
        location.reload();  // Reload the page to refresh the list of activities and map
    } catch (error) {
        console.error("Error removing document: ", error);
    }
}

window.onload = initMap;
window.removeActivity = removeActivity;
