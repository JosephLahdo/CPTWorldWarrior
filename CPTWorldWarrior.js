/* CPT World Warrior

The purpose of this tool is to allow the user to select from a list of E-sports 
events that they wish to attend. They provide their zipcode, number of passengers, 
and desired travel times - the tool then searches for the cheapest possible flight 
and hotel information and returns that information to the user.  

*/

// globals

var globals             = {};
globals.events          = events; // defined in events.js
globals.locations       = {};
globals.userValues      = null;
globals.selectedEvents  = null;
globals.requestsPending = 0;
globals.totalRequests   = 0;

// Given a selection of E-sports events, we want to find a suitable flight from 
// the user's location to the event, as well as a hotel in the event's city.

// The request flow is as follows:
// 1. Given the user's zip code, make an API call to Google Maps geocoding API
//    to return the user's latitude and longitude.
// 2. Given the user's latitude and longitude, make an API call to the SITA Aero
//    Airport API to return a list of airports near the user's location.
// 3. Given a selection of events, make an API call to the SITA Aero Airpot API
//    for each event, to return an airport for that event's location.
// 4. For each selected event, make an API call to the Google QPX Express API,
//    supplying the user's closest airport code and the event's closest airport
//    code. This will return flight information between the two airports, 
//    and the least expensive flight can be selected.
// 5. For each selected event, make an API call to the Expedia API to retrieve
//    hotel booking information for the given event location and dates.
// 6. Given a feasible hotel and flight, display this information to the user.

// When DOMContentLoaded event has fired, we want to create the UI.
document.addEventListener("DOMContentLoaded", function() {
    createUI();
});

// Setup the user interface for the user to input data and start searching.
// Create the thumbnail grid, initialize the progress bar, and hook up
// the submit button.
function createUI() {
    createEventThumbnailGrid();
    createProgressBar();
    setSubmitButton();
}

// The main function that is executed when the user clicks "Submit"
function submitMain() {
    // Get the selected events from the user interface grid
    globals.selectedEvents = getSelectedEvents();

    // Validate the selected events and present error if invalid
    if (isValidSelectedEvents(globals.selectedEvents) != true) {
        return;
    }

    // Get the user input from the user interface form
    globals.userValues = getUserValues();

    // Validate the user form input and present error if invalid
    if (isValidUserValues(globals.userValues) != true) {
        return;
    }

    prepareUIForSearch();
    startRequests(globals.selectedEvents, globals.userValues);
}

// Hook up the submitMain function to the "click" event
// of the submit button.
function setSubmitButton() {
    var submitButton = document.getElementById("submitButton");
    submitButton.addEventListener("click", submitMain);
}

// Create a grid of event thumbnails. This will allow the user
// to click on a thumbnail to be able to search for flights/hotel
// for that event. See createThumbnail() for an example of the
// markup generated for each event thumbnail.
function createEventThumbnailGrid() {
    var container = document.getElementById("container")
    var row = document.getElementById("row");
    // Generate a grid with rows of 4 event thumbnails each.
    for (var i = 0; i < globals.events.length; i += 4) {
        var row = document.createElement('div');
        row.className = "eventThumbnails row row-eq-height";
        for (var j = 0; j < 4; j++) {
            if (globals.events[i + j])
                createThumbnail(globals.events[i + j], row);
        }
        container.appendChild(row);
    }
}

// create thumbnail element that will appear in the grid
// that allows the user to choose their event to search for.
// example:
/*
<div class="col-md-3 portfolio-item">
    <a class="thumbnail" href="#">
        <img class="col-sm-4" src="http://capcomprotour.com/wp-content/uploads/2014/02/
        final-round.jpg" alt="Final Round" height="750" width="400">
        <h5>Final Round</h5>
    </a>
</div>
*/
function createThumbnail(event, row) {
    var src = event.imageSrc;
    var alt = event.imageAlt;
    var imageDivClass = "col-md-3 portfolio-item";
    var imageDivClassSelected = "col-md-3 portfolio-item bg-success";
    var imageClass = "col-sm-4";

    var thumbDiv = document.createElement("div");
    thumbDiv.setAttribute("class", imageDivClass);

    var anchorDiv = document.createElement("a");
    anchorDiv.setAttribute("class", "thumbnail");

    var imgDiv = document.createElement("img");
    imgDiv.setAttribute("class", imageClass);
    imgDiv.setAttribute("src", src);
    imgDiv.setAttribute("alt", alt);
    imgDiv.setAttribute("height", "750");
    imgDiv.setAttribute("width", "400");

    var eventName = document.createElement('h5');
    eventName.innerHTML = event.name;

    thumbDiv.addEventListener("click", function() {
        var classString = this.getAttribute("class");
        if (classString == imageDivClass) {
            this.setAttribute("class", imageDivClassSelected);
        } else {
            this.setAttribute("class", imageDivClass);
        }
    });

    thumbDiv.appendChild(anchorDiv);
    anchorDiv.appendChild(imgDiv);
    anchorDiv.appendChild(eventName)
    row.appendChild(thumbDiv);
}

// Create a progress bar for displaying the search progress.
function createProgressBar() {
    var progressDiv = document.getElementById('progressDiv');
    
    var div = document.createElement('div');
    div.className = "progress";
    
    var progressBar = document.createElement('div');
    progressBar.id = "progressBar";
    progressBar.className = "progress-bar progress-bar-success";
    progressBar.setAttribute('role', 'progressbar');
    progressBar.setAttribute('aria-valuenow', '0');
    progressBar.setAttribute('aria-valuemin', '0');
    progressBar.setAttribute('aria-valuemax', '100');
    progressBar.setAttribute('style', 'width:0%');
    progressBar.innerHTML = "Submit data to begin.";

    div.appendChild(progressBar);
    progressDiv.appendChild(div);
}

// Increment the progress of the progress bar. This is done for each
// successful request completion. When all requests have been completed,
// display a "complete" message.
function incrementProgressBar(message) {
    var progressBar = document.getElementById('progressBar');
    var progress = parseFloat(progressBar.getAttribute('aria-valuenow'));
    var increment = 1/globals.totalRequests * 100;
    var newProgress = progress + increment;

    progressBar.setAttribute('aria-valuenow', newProgress);
    progressBar.setAttribute('style', "width:" + newProgress + "%");

    if (Math.ceil(newProgress) == 100)
        progressBar.innerHTML = "Complete!";
    else {
        progressBar.innerHTML = Math.ceil(newProgress) + "%  " + message;
    }

    progressBar.className = "progress-bar progress-bar-striped active";
}

// Given a div that represents the event thumbnail, lookup
// the inner image element
/* eg:
<div class="col-md-3 portfolio-item bg-success">
    <a class="thumbnail">
        <img class="col-sm-4" alt="...">
...
*/
function getThumbnailForElement(element) {
    if (element) {
        var childNodes = element.childNodes;
        if (childNodes[0]) {
            var innerAnchor = childNodes[0];
            if (innerAnchor.childNodes[0]) {
                return innerAnchor.childNodes[0];
            }
        }
    }
    return null;
}

// Given a selected element div, first lookup the thumbnail
// image for that div. Then, find the event in the global events
// array that has a matching "alt" property. This is our selected event.
function getEventForElement(element) {
    var thumbnail = getThumbnailForElement(element);
    if (thumbnail) {
        var alt = thumbnail.getAttribute("alt");
        var foundEvent = find(globals.events, function(event) {
            return (alt == event.imageAlt);
        });
        return foundEvent;
    }
    return null;
}

// Given a row from the events grid, filter on that row's childNodes.
// Only return element whose class name indicates that it is selected.
// It is selected if it contains the bg-success class name.
function getSelectedElementsFromGridRow(row) {
    var elements = row.childNodes;
    var selectedElements = filter(elements, function(item, index, collection) {
        if (item.nodeType == 1) {
            var className = item.getAttribute("class");
            if (className == "col-md-3 portfolio-item bg-success") {
                return true;
            }
        }
        return false;
    });
    return selectedElements;
};

// Return an array of all selected elements from the events grid.
// This involves going row-by-row to find all elements with the class name
// string indicating it is selected. 
function getSelectedElementsFromGrid() {
    var selectedElements = [];
    var gridRows = document.getElementsByClassName("eventThumbnails");
    each(gridRows, function(item, index, collection) {
        var selectedElementsInRow = getSelectedElementsFromGridRow(item);
        if (selectedElementsInRow.length > 0)
            selectedElements = selectedElements.concat(selectedElementsInRow);
    });
    return selectedElements;
}

// Return an array of all elements contained in the events grid.
function getElementsFromGrid() {
    var elements = [];
    var gridRows = document.getElementsByClassName("eventThumbnails");
    each(gridRows, function(row, rowIndex, rowArray) {
        var rowElements = row.childNodes;
        if (rowElements.length > 0) {
            each(rowElements, function(element, elementIndex, elementArray) {
                elements = elements.concat(element);
            });
        }
    });
    return elements;
}

// Get an array of all selected events based on the selected elements
// from the events grid. First, get a list of selected elements.
// Then, create an events array by mapping the element to its event object.
function getSelectedEvents() {
    var selectedElements = getSelectedElementsFromGrid();
    if (selectedElements) {
        return map(selectedElements, getEventForElement);
    }
    return null;
}

// Validate the selected events array. If it's not valid ie. the user
// hasn't chosen an event, then alert the user and return false.
function isValidSelectedEvents(selectedEvents) {
    if (selectedEvents && selectedEvents.length > 0) {
        return true;
    }
    alert("You must select an event from the grid to continue.");
    return false;
}

// Read the user supplied values from the input elements and
// return these values in an object.
function getUserValues() {
    var values = {};

    values.zipCode                  = document.getElementById("inputZip").value;
    values.budget                   = document.getElementById("budget").value;
    values.passengerCount           = document.getElementById("passengers").value;
    values.earliestDepartureHour    = document.getElementById("edHour").value;
    values.earliestDepartureMinutes = document.getElementById("edMinutes").value;
    values.latestDepartureHour      = document.getElementById("ldHour").value;
    values.latestDepartureMinutes   = document.getElementById("ldMinutes").value;
    values.earliestDepartureTime    = values.earliestDepartureHour + 
                                        ":" + values.earliestDepartureMinutes;
    values.latestDepartureTime      = values.latestDepartureHour + 
                                        ":" + values.latestDepartureMinutes;

    return values;
}

// For each of the user supplied values, validate them and return true
// only if each value is valid.
function isValidUserValues(values) {
    if (!values)
        return false;

    var isValidZipCode          = validateZIP(values.zipCode);
    var isValidBudget           = validateBudget(values.budget);
    var isValidPassengerCount   = validatePassengerCount(values.passengerCount);
    var isValidEarliestHour     = validateHour(values.earliestDepartureHour);
    var isValidEarliestMinutes  = validateMinutes(values.earliestDepartureMinutes);
    var isValidLatestHour       = validateHour(values.latestDepartureHour);
    var isValidLatestMinutes    = validateMinutes(values.latestDepartureMinutes);

    var validators = [isValidZipCode, isValidBudget, isValidPassengerCount, 
                      isValidEarliestHour, isValidLatestHour, 
                      isValidEarliestMinutes, isValidLatestMinutes];

    // User values are valid if every input value is valid.
    var isValid = every(validators, function(valid) { return valid; });

    return isValid;
}

// Prepare the user interface to begin searching
function prepareUIForSearch() {
    // Disable the submit button while search is in progress
    toggleSubmitButton();

    // Remove the events that aren't selected from the UI
    removeUnselectedEventsFromGrid();

    // Update the UI messages to indicate what 
    // information the user is searching for.
    updateUITextForSearch();
}

// Toggle the disabled and active state of the submit button
// Change the appearance of the submit button to reflect its current state
function toggleSubmitButton() {
    var submitButton = document.getElementById('submitButton');
    if (submitButton) {
        if (submitButton.getAttribute("aria-pressed") == "false") {
            submitButton.setAttribute("aria-pressed", "true");
            submitButton.setAttribute("disabled", "true");
        } else {
            submitButton.setAttribute("aria-pressed", "true");
            submitButton.setAttribute("disabled", "false");
        }
    }
}

// After pressing the submit button, remove any of the unselected events
// from the grid to indicate to the user which events we are searching for.
function removeUnselectedEventsFromGrid() {
    var elements = getElementsFromGrid();
    if (elements && elements.length > 0) {
        each(elements, function(element, index, collection) {
            if (element.nodeType == 1) {
                var className = element.getAttribute("class");
                if (className == "col-md-3 portfolio-item") {
                    // Remove this element from the DOM (events grid).
                    element.remove();
                }
            }
        });
    }
}

// Update the messages on the UI to indicate that we are beginning to
// search for flights and hotels. 
function updateUITextForSearch() {
    var resultsDiv = document.getElementById('resultsDiv');
    if (resultsDiv)
        resultsDiv.innerHTML = "These are the event(s) you have selected";

    var instructionPrompt = document.getElementById('instructionalPrompt');
    if (instructionPrompt)
        instructionPrompt.innerHTML = "The flight information you provided";

    var output = document.getElementById('output');
    if (output)
        output.innerHTML = "Your flights";
}

// The first request method that prepares the callback functions and makes
// the initial API call for the user's latitude and longitude.
function startRequests(selectedEvents, userValues) {
    createEventCallbacks(selectedEvents);
    // For each event there are 2 requests:
    //  * 1 request to get the list of flights
    //  * 1 request to get the list of hotels
    // For the user, there are 2 requests:
    //  * 1 request for the user's location latitude/longitude based on zip code.
    //  * 1 request for the user's nearby airports.
    globals.totalRequests = selectedEvents.length * 2 + 2;
    globals.requestPending = globals.totalRequests;
    userLocationRequest(userValues.zipCode);
}

// For each event, create a callback that will be called after we get back the
// airport for that event's location. This is required since the SITA Aero Airport
// API is json-callback based, so we must have a defined callback function and
// callback name to supply the API. The callback name is, eg:
//   globals.selectedEvents[0].callback (for the 1st event)
// After receiving the airport, make requests to get flights and hotels.
function createEventCallbacks(selectEvents) {
    each(selectEvents, function(event, index, collection) {
        event.callbackName = "globals.selectedEvents[" + index + "].callback";
        event.callback = function(data) {
            event.ArrivalAirports = [];
            event.ArrivalAirports.push(data.airports);
            makeFlightRequestForEvent(event);
            makeHotelRequest(event.locationLatitude, event.locationLongitude, event);
        }
    });
}

// Make an API call to retrieve the user's geocoded latitude and longitude,
// based on their supplied zip code. Run the userLocationCallback function with 
// the returned data.
function userLocationRequest(zipCode) {
    locationRequest(zipCode, userLocationCallback);
}

// Given a zipcode, make an API call to return the geocoded location
// latitude and longitude. Uses Google Maps Geocoding API:
// https://developers.google.com/maps/documentation/geocoding/start 
function locationRequest(zipCode, successCallback) {
    var apiKey = "AIzaSyBpT3NYIomURKXjpxCcgPGvg7n9w66OhIk";
    var url = "https://maps.googleapis.com/maps/api/geocode/json?address= " + 
              "Torun&components=postal_code:" + zipCode + "|country:US&key=" + 
               apiKey;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() {
        if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
            var data = JSON.parse(this.responseText);
            successCallback.call(this,data);
        }
    };
    xhr.send();
}

// Given the returned user's latitude and longitude, store that data
// to be used later. If we get back valid data, then update the progress
// and make the next request to get a list of airports near the user.
function userLocationCallback(data) {
    if (storeUserLocation(data) != true) {
        alert("Could not get your location. Please refresh and try again.");
        return;
    }
    incrementProgressBar("Getting your nearby airports...");
    var userLat = globals.locations.user.lat;
    var userLng = globals.locations.user.lng;
    airportForLocationRequest(userLat, userLng, "userAirportCallback");
}

// Validate and store the user's latitude and longitude in the globals object.
function storeUserLocation(data) {
    if (data && data.results && data.results[0]) {
        globals.locations.user = {};
        globals.locations.user.lat = data.results[0].geometry.location.lat;
        globals.locations.user.lng = data.results[0].geometry.location.lng;
        return true;
    }
    return false;
}

// Given a latitude and longitude, make an API call to the SITA Aero
// Airport API to get a list of airports near that location.
// This is a callback-based API. A callback name is supplied. To run this API,
// a script with the API URL is added to the page, and will execute the callback.
// https://www.developer.aero/Airport-API/API-Overview
function airportForLocationRequest(locationLat, locationLng, cbname) {
    var apiKey = "ef10b5c731760c11accfe4ac5e84e900";
    var url = "https://airport.api.aero/airport/nearest/" + locationLat + "/" 
            + locationLng + "?maxAirports=5&user_key=" + apiKey + "&callback=" 
            + cbname;
    var script = document.createElement('script');
    script.src = url;
    document.querySelector('head').appendChild(script);
}

// Given the list of airports near the user's location, store this for the
// user. Next, for each selected event, we can make an API call to get a list
// of airports near each event location.
function userAirportCallback(data) {
    globals.locations.user.Airports = [];
    globals.locations.user.Airports.push(data.airports);
    incrementProgressBar("Getting your flights...");
    airportsForEventsRequests();
}

// For each selected event, make an API call to get a list of airports.
// Supply the event's latitude and longitude, as well as the callback function
// name for that event.
function airportsForEventsRequests() {
    each(globals.selectedEvents, function(event, index, collection) {
        if (event.locationLatitude && event.locationLongitude) {
            var lat = event.locationLatitude;
            var lng = event.locationLongitude;
            var cbname = event.callbackName;
            airportForLocationRequest(lat, lng, cbname);
        }
    });
}

// For the given event, make an API call to get the possible flights for
// the event location. Include user supplied passenger count, budget, as well as
// the event location and event dates.
function makeFlightRequestForEvent(event) {
    // for now, only lookup events in the US
    if (event.locationCountry !== "USA") {
        return;
    }

    var passengerCount = globals.userValues.passengerCount;
    var budget = "USD" + globals.userValues.budget;
    var departingAirport = globals.locations.user.Airports[0][0].code;
    var arrivalAirport = event.ArrivalAirports[0][0].code;
    var e = event;
    var eventDate = e.startYear + "-" + e.startMonth + "-" + e.startDate;
    var eventEndDate = e.endYear + "-" + e.endMonth + "-" + e.endDate;

    flightRequest(passengerCount, departingAirport, arrivalAirport,
                  eventDate, eventEndDate, budget, e.name,
                  flightRequestCallback);
}

// Given data for specifying a flight search with the Google QXP API,
// package this data into an object. This object will be stringified 
// to JSON and should fit the QPX API requirements.
function makeFlightData(passengerCount, departingAirport, arrivalAirport,
                        eventDate, eventEndDate, budget) {
    var values = globals.userValues;
    var data = {
        "request": {
            "passengers": {
                "adultCount": passengerCount
            },
            "slice": [{
                "origin": departingAirport,
                "destination": arrivalAirport,
                "date": eventDate,
                "permittedDepartureTime": {
                    "earliestTime": values.earliestDepartureTime,
                    "latestTime": values.latestDepartureTime,
                }
            }, {
                "origin": arrivalAirport,
                "destination": departingAirport,
                "date": eventEndDate,
            }],
            "solutions": "1",
            "maxPrice": budget
        }
    };
    return data;
}

// API call for requesting flight information via Google QPX API
// https://developers.google.com/qpx-express/
function flightRequest(passengerCount, departingAirport, arrivalAirport, eventDate,
                       eventEndDate, budget, eventName, successCallback) {
    
    var key = "AIzaSyAOYPGasInrKTgR94FIs56NeYgsu-02XN0"; 
    var url = "https://www.googleapis.com/qpxExpress/v1/trips/search?key=" + key;
    
    var flightData = makeFlightData(passengerCount, departingAirport, 
                                    arrivalAirport, eventDate,
                                    eventEndDate, budget, eventName);
    var dataStr = JSON.stringify(flightData);
    
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.eventName = eventName;
    xhr.onreadystatechange = function() {
        if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
            var data = JSON.parse(this.responseText);
            successCallback.call(this, data, eventName);
        }
    };

    xhr.send(dataStr);
}

// This is the function called after receiving data back from the Google
// QPX API. Update the pending requests number, parse the returned JSON,
// and display the flight information in the output. 
function flightRequestCallback(data, eventName) {
    globals.requestPending--;
    var parsedFlight = parseFlight(data);
    if (parsedFlight != null) {
        storeFlightForEvent(parsedFlight, eventName);
        displayFlight(parsedFlight, eventName);
        redirectToResults();
    }
}

// Given JSON returned from the Google QPX express API, parse the JSON
// object and retrieve information relevant to display to the user.
function parseFlight(data) {
    var flight = [];
    if (!data.trips.tripOption) {
        return null;
    }
    // 1 part for departing flight, 1 part for return flight
    var flightParts = 2; 
    var trip = data.trips.tripOption[0];
    if (trip) {
        for (var i = 0; i < flightParts; i++) {
            var flightLeg = trip.slice[i];
            if (flightLeg) {
                var flightInfo = {
                    "carrier": flightLeg.segment[0].flight.carrier,
                    "number": flightLeg.segment[0].flight.number,
                    "arrivalTime": flightLeg.segment[0].leg[0].arrivalTime,
                    "departureTime": flightLeg.segment[0].leg[0].departureTime,
                    "origin": flightLeg.segment[0].leg[0].origin,
                    "destination": flightLeg.segment[0].leg[0].destination,
                    "saleTotal": trip.pricing[0].saleTotal
                };
                flight.push(flightInfo);
            }
        }
        return flight;
    }
    return null;
}

// Store the parsed flight information in the global events array for 
// the given event name.
function storeFlightForEvent(flight, eventName) {
    var foundEvent = getEventForEventName(eventName);
    if (foundEvent) {
        foundEvent.flightInfo = flight;
    }
}

// Given the parsed flight data and the event name, update the progress bar
// and add the flight data to the "output" container at the bottom of the page.
function displayFlight(flight, eventName) {
    containerDiv = document.getElementById("output");
    incrementProgressBar("Getting flights...");
    createFlightDiv(containerDiv, flight, eventName);
}

// Given the event name, look up the stored hotel information.
// Use the "details" URL to create an anchor to redirect to the Expedia
// page for the hotel. This anchor will be added to the flight details
// displayed in the search results.
function createHotelInfoAnchor(eventName) {
    var hotel = getHotelForEvent(eventName);
    var detailsURLAnchor = document.createElement('a');
    if (hotel && hotel[0]) {
        var hotelURL = hotel[0].details;
        var redirect = "javascript:window.open('" + hotelURL + "', '_blank');";
        detailsURLAnchor.setAttribute("href", redirect);
        detailsURLAnchor.innerHTML = "Hotel Details and Booking Here!";
    }
    return detailsURLAnchor;
}

// Given flight information, create a div that is used to display the 
// flight information to the user. Hook up this div to the eventAnchor,
// so that clicking on the event name will toggle the display visibility.
function createFlightDataDiv(eventAnchor, flight, eventName) {
    // Create a div to contain the flight data
    var dataDiv = document.createElement('div');
    dataDiv.className = "well";

    // Create output elements to display each piece of fligt data
    var carrier             = document.createElement('p');
    var flightNumber        = document.createElement('p');
    var arrivalTime         = document.createElement('p');
    var departureTime       = document.createElement('p');
    var origin              = document.createElement('p');
    var destination         = document.createElement('p');
    var returnCarrier       = document.createElement('p');
    var returnFlightNumber  = document.createElement('p');
    var returnArrivalTime   = document.createElement('p');
    var returnDepartureTime = document.createElement('p');
    var returnOrigin        = document.createElement('p');
    var returnDestination   = document.createElement('p');
    var saleTotal           = document.createElement('p');

    var f1 = flight[0];     // Flight to event
    var f2 = flight[1];     // Returning flight

    // Put the flight information into the output elements
    carrier.textContent         = "The flight carrier is: " + f1.carrier;
    flightNumber.textContent    = "The flight number is: " + f1.number;
    arrivalTime.textContent     = "The arrival time is: " + f1.arrivalTime;
    departureTime.textContent   = "The departure time is: " + f1.departureTime;
    origin.textContent          = "The origin is: " + f1.origin;
    destination.textContent     = "The destination is: " + f1.destination;

    returnCarrier.textContent       = "The return flight carrier is: " 
                                    + f2.carrier;
    returnFlightNumber.textContent  = "The return flight number is: " 
                                    + f2.number;
    returnArrivalTime.textContent   = "The return arrival time is: " 
                                    + f2.arrivalTime;
    returnDepartureTime.textContent = "The return departure time is: " 
                                    + f2.departureTime;
    returnOrigin.textContent        = "The return origin is: " + f2.origin;
    returnDestination.textContent   = "The return destination is: " 
                                    + f2.destination;
    saleTotal.textContent           = "The return sale total is: " 
                                    + f2.saleTotal;

    // Add each element to the containing data div
    dataDiv.appendChild(carrier);
    dataDiv.appendChild(flightNumber);
    dataDiv.appendChild(arrivalTime);
    dataDiv.appendChild(departureTime);
    dataDiv.appendChild(origin);
    dataDiv.appendChild(destination);
    dataDiv.appendChild(saleTotal);
    dataDiv.appendChild(returnFlightNumber);
    dataDiv.appendChild(returnArrivalTime);
    dataDiv.appendChild(returnDepartureTime);
    dataDiv.appendChild(returnOrigin);
    dataDiv.appendChild(returnDestination);

    // Create an anchor to redirect to Expedia for the hotel
    var hotelInfoAnchor = createHotelInfoAnchor(eventName);
    dataDiv.appendChild(hotelInfoAnchor);

    // Add an event listener for the click event on the event anchor.
    // Toggle (hide) the display of the flight data div.
    eventAnchor.addEventListener("click", function() {
        toggle(dataDiv);
    });

    return dataDiv;
}

// Create anchor for the event name, to allow toggling of the flight info div.
function createEventAnchor(eventName) {
    var anchor = document.createElement('a');
    anchor.id = "anchor-" + eventName;
    anchor.innerHTML = eventName;
    return anchor;
}

// Toggle the visibility of element
function toggle(element) {
    if (element.style.display == "block") {
        element.style.display = "none";
    } else {
        element.style.display = "block";
    }
}

// Create a div to display the flight information to the user for the
// given event name. Allow this div to be toggled by clicking on an
// anchor displaying the event name. Given returned hotel data,
// create an anchor that, when clicked on, redirects to the Expedia page
// for that hotel.
function createFlightDiv(container, flight, eventName) {
    var flightInfoDiv = document.createElement('div');
    
    var eventAnchor = createEventAnchor(eventName);
    var dataDiv = createFlightDataDiv(eventAnchor, flight, eventName);

    // Add the event anchor and flight details
    flightInfoDiv.appendChild(eventAnchor);
    flightInfoDiv.appendChild(dataDiv);

    // Add the flight info div to the output container div
    container.appendChild(flightInfoDiv);
}

// If there are no requests pending, then
// redirect to the results output at the bottom of page.
function redirectToResults() {
    if (globals.requestsPending == 0) {
        document.location.href = "#output";
    }
}

// For the given location and event, trigger a request for the hotel
// API call to retrieve a hotel for the event's city and specified
// event dates.
function makeHotelRequest(latitude, longitude, event) {
    hotelRequest(latitude, longitude, event, hotelRequestCallback);
}

// Make an API call for the Expedia Hotel Search API, and run
// successCallback when we have results back.
// http://hackathon.expedia.com/node/1911
function hotelRequest(lat, longitude, event, successCallback) {
    var e = event;

    var url = "http://terminal2.expedia.com:80/x/hotels?maxhotels=10&";
    url += "location=" + lat + "%2C" + longitude + "&radius=5km&";
    url += "checkInDate=" + e.startYear + "-" + e.startMonth + "-" + e.startDate;
    url += "&checkOutDate=" + e.endYear + "-" + e.endMonth + "-" + e.endDate + "&";
    url += "adults=1&sort=price&include=description%2C%20address%2C%20" + 
           "thumbnailurl%2C%20amenitylist%2C%20geolocation&allroomtypes=false";
    
    var xhr = new XMLHttpRequest();
    var key = "B7IRgNygcFP70m4ghOe2zNuIbHhSUzdR";
    xhr.open("GET", url, true);
    xhr.setRequestHeader("Authorization", "expedia-apikey key=" + key);
    xhr.onreadystatechange = function() {
        if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
            var data = JSON.parse(this.responseText);
            successCallback.call(this, data, event.name);
        }
    };

    xhr.send();
}

// Executed after getting back data from the Expedia Hotel Search API.
// Parse the returned JSON data, store the hotel information in the global
// events array for the particular event.
function hotelRequestCallback(data, eventName) {
    incrementProgressBar("Getting your hotel...");
    var parsedHotel = parseHotel(data);
    if (parsedHotel != null) {
        storeHotelForEvent(parsedHotel, eventName);
    }
}

// Parse the return JSON object from the Expedia Hotel Search API
// The API returns a list of hotels given the search parameters, sorted
// from lowest to highest price. For now, we select the lowest priced hotel.
function parseHotel(data) {
    if (!data || !data.HotelCount) {
        return null;
    }
    var hotels = [];
    var numHotels = data.HotelCount;
    if (data.HotelInfoList) {
        for (var i = 0; i < numHotels; i++) {
            var hotelInfo = data.HotelInfoList.HotelInfo[i];
            if (hotelInfo) {
                var validHotel = {
                    "name": hotelInfo.Name,
                    "price": hotelInfo.Price.TotalRate.Currency + 
                             " " + hotelInfo.Price.TotalRate.Value,
                    "thumbnailURL": hotelInfo.ThumbnailUrl,
                    "details": hotelInfo.DetailsUrl
                }
                hotels.push(validHotel)
            }
            return hotels;
        }
    }
    return null;
}

// In the global events array (globals.events), search for the 
// event with the matching event name and return it.
function getEventForEventName(eventName) {
    return find(globals.selectedEvents, function(event) {
        return (event.name == eventName);
    });
}

// In the global events array (globals.events), find the event
// for eventName and store the hotel object.
function storeHotelForEvent(hotel, eventName) {
    var foundEvent = getEventForEventName(eventName);
    if (foundEvent) {
        foundEvent.hotelInfo = hotel;
    }
}

// In the global events array (globals.events), find the event
// for eventName and return the hotel data object.
function getHotelForEvent(eventName) {
    var foundEvent = getEventForEventName(eventName);
    if (foundEvent) {
        return foundEvent.hotelInfo;
    }
    return null;
}

// Validate the user provided zipcode.
// alert the user in instances where user provided data is not acceptable.
function validateZIP(field) {
    var valid = "0123456789-";
    var hyphencount = 0;

    if (field.length != 5 && field.length != 10) {
        alert("Please enter your 5 digit or 5 digit+4 zip code.");
        return false;
    }
    for (var i = 0; i < field.length; i++) {
        temp = "" + field.substring(i, i + 1);
        if (temp == "-") hyphencount++;
        if (valid.indexOf(temp) == "-1") {
            alert("Invalid characters in your zip code. Please try again.");
            return false;
        }
        if ((hyphencount > 1) || 
            ((field.length == 10) && "" + field.charAt(5) != "-")) {
            alert("The hyphen character should be used with a properly formatted" + 
                "5 digit+four zip code, like '12345-6789'.");
            return false;
        }
    }
    return true;
}

// Validate user provided budget
// alert the user in instances where user provided data is not acceptable.
function validateBudget(input) {
    if (isNaN(input)) {
        alert("your listed budget is not a numerical value");
        return false;
    }
    var input = Number(input);
    if (input <= 0) {
        alert("budget must be greater than 0");
        return false;
    }
    return true;
}

// Validate user provided passenger count.
// alert the user in instances where user provided data is not acceptable.
function validatePassengerCount(input) {
    if (input.length != 1) {
        alert("your selected passengers is not a recognized value");
        return false;
    }
    var input = Number(input);
    if (isNaN(input)) {
        alert("your selected passengers is not a numerical value");
        return false;
    } else if (input > 0) {
        return true;
    } else {
        alert("input must be greater than 0");
        return false;
    }
}

// Validate user provided hours
// alert the user in instances where user provided data is not acceptable. 
function validateHour(input) {
    if (input.length != 2) {
        alert("must be in double digit values ex: 00 for midnight");
        return false;
    }
    var input = Number(input);
    if (isNaN(input)) {
        alert("your selected passengers is not a numerical value");
        return false;
    } else if (input <= 23 && input >= 0) {
        return true;
    } else {
        alert("hour input must be greater than or equal to 0 and less than 23");
        return false;
    }
}

// Validate user provided minutes
// alert the user in instances where user provided data is not acceptable.
function validateMinutes(input) {
    if (input.length != 2) {
        alert("");
        return false;
    }
    var input = Number(input);
    if (isNaN(input)) {
        alert("your selected passengers is not a numerical value");
        return false;
    } else if (input <= 59 && input >= 0) {
        return true;
    } else {
        alert("minutes input must be greater than or equal to 0 and less than 59");
        return false;
    }
}

// Return true only if the predicate function returns true
// for every element of array.
function every(array, predicate) {
    for (var i = 0; i < array.length; i++) {
        if (predicate(array[i]) != true) {
            return false;
        }
    }
    return true;
}

// Execute the callback function for each element of the
// array. *For now, this is implemented only for arrays.
function each(array, callback) {
    for (var i = 0; i < array.length; i++) {
        callback(array[i], i, array);
    }
    return array;
}

// Look for an element in array for which, when applied to it,
// the test() function returns true. If not found, return null.
function find(array, test) {
    for (var i = 0; i < array.length; i++) {
        var item = array[i];
        if (test(item) == true)
            return item;
    }
    return null;
}

// Given an array, produce a new array by applying the function f()
// to every element of the array.
function map(array, f) {
    var results = [];
    for (var i = 0; i < array.length; i++) {
        results.push(f(array[i]));
    }
    return results;
}

// Give an array, return a new array containing only elements
// that pass the predicate test() function. Element A should appear
// in the output array only if test(A) == true
function filter(array, test) {
    var passed = [];
    for (var i = 0; i < array.length; i++) {
        if (test(array[i]) == true)
            passed.push(array[i]);
    }
    return passed;
}