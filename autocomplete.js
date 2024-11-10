let autocomplete;
let placeChangedCallback;

export function initAutocomplete(inputID, callback) {
    const input = document.getElementById(inputID);
    autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['(regions)'] // Limit to cities, can be modified
    });

    // Set up an event listener on `place_changed`
    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
            callback(place.geometry.location);
        } else {
            console.log("No geometry details available for the selected place.");
        }
    });
}

function onPlaceChanged(autocomplete) {
    const place = autocomplete.getPlace();
    if (!place.geometry) {
        console.log("No details available for the selected location.");
        return;
    }

    const location = place.geometry.location;
    placeChangedCallback(location); // Call custom callback with location
}

export function searchAttractions(location, callback) {
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    const request = {
        location: location,
        radius: '50000', // Search within 50km radius
        type: ['tourist_attraction']
    };

    service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
            callback(results);
        } else {
            console.log("No attractions found.");
            callback([]); // Return empty array if no results
        }
    });
}

export function searchAttractionsByText(locationText, callback) {
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    const request = {
        query: locationText,
        type: ['regions']
    };

    service.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
            const locationCoords = results[0].geometry.location;
            searchAttractions(locationCoords, callback); // Use nearby search based on text location
        } else {
            console.log("No attractions found for text search.");
            callback([]);
        }
    });
}

export function displayNoAttractionsMessage() {
    const attractionContainer = document.getElementById('attractionsContainer');
    attractionContainer.innerText = ''; // Clear previous results
    
    const noAttractionsMessage = document.createElement('h2');
    noAttractionsMessage.innerText = 'No attractions found'; // Set the message text    
    attractionContainer.appendChild(noAttractionsMessage);
}

