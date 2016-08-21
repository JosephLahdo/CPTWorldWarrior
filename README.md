Readme

--------------------
Purpose
--------------------

With the advent of e-sports gaming comes the opportunity for millions of casual gamers to attend and compete for hundreds of thousands of dollars in cash prizes. The purpose of this application is to provide the user with the cheapest possible flight and hotel information for their desired event in the Capcom Pro Tour season for Street Fighter V. The application first geocodes the user's location, then the location of each of the events. After doing this the application will then use another API call to find the nearest airports for both the user and for each of the events.Another API call will be made to find the cheapest available flight for the desired, following that API call will be another for the hotel information. After these calls are completed, all pertinnent information will be pushed to the user through the DOM.


--------------------
The Code
--------------------

Within the file CPTWorldWarrior.js all functions feature a short commented description of the function's purpose. A good portion of the UI is built within javascript with the styling of the elements drawn from the bootstrap library. The true functionality of the application begins with the on click function "submitMain" - where a cascade of functions are called to do everything from validate the user's input to display the information gained by API calls to the user via the DOM. Style guidelines for the code itself taken from AirBnB's own style guide outline. 


The request flow is as follows:

1. Given the user's zip code, make an API call to Google Maps geocoding API
   to return the user's latitude and longitude.
   https://developers.google.com/maps/documentation/geocoding/start

2. Given the user's latitude and longitude, make an API call to the SITA Aero
    Airport API to return a list of airports near the user's location.
    https://www.developer.aero/Airport-API/API-Overview

3. Given a selection of events, make an API call to the SITA Aero Airpot API
    for each event, to return an airport for that event's location.
    https://www.developer.aero/Airport-API/API-Overview

4. For each selected event, make an API call to the Google QPX Express API,
    supplying the user's closest airport code and the event's closest airport
    code. This will return flight information between the two airports, 
    and the least expensive flight can be selected.
    https://developers.google.com/qpx-express/

5. For each selected event, make an API call to the Expedia API to retrieve
   hotel booking information for the given event location and dates.
   http://developer.expedia.com/node/1911

6. Given a feasible hotel and flight, display this information to the user.



--------------------
Input fields 
--------------------
Within the input fields

Input a valid six digit zipcode.
Input a desired budget, a whole number value is in the United States dollar, no symbols. 
Input the desired number of passengers, whole number value only.
Input the earliest time of departure hour value, this must be done in military or 24 hour clock format. 
Input the earliest time of departure minute value, this may be any value from 00 to 59. 
Input the latest time of departure hour value in the same format as the earliest time of departure hour value. 
Input the latest time of departure minute value in the same format as the earliest time of departure minute value.

Following the input of these values, select any of the events listed below by clicking on the element, this will highlight the element to indicate it's been selected. 

Once all of the above has been complete, press the submit button. 

Flight results will be displayed below with a link to the hotel information for that event. 

--------------------
Example of valid input
--------------------

An example of a successful submit would be as follows: 

Your Zipcode: 94062
Your Budget: 2000
Your Passengers: 3
Your Earliest Departure Time Hour: 01
Earliest Departure Time Minutes: 00
Your Latest Departure Time Hour: 23
Latest Departure Time Minutes: 59

Click on divs correlating to desired events

Click "Submit" button
