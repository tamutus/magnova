// Base URL for country JSON:
//          https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/10m/cultural/ne_10m_admin_0_countries.json


  //==============================//
 // Capture DOM elements with d3 //
//==============================//
const   mapContainer = d3.select("#map-container"),
        infoDisplayContainer = mapContainer.select("#location-info-display-container"),
        sublocationContainer = mapContainer.select("#sublocation-list-container"),
        sublocationList = sublocationContainer.select("#sublocation-list"),
        infoDisplay = infoDisplayContainer.select("#location-info-display"),
        locationName = infoDisplay.select("#location-info-header").select("#location-name").select("span.location-name"),
        wikiButton = infoDisplay.select("#wiki-button"),
        colorEditor = infoDisplay.select("#color-editor"),
        colorName = d3.select("#location-color-name"),
        superlocationName = d3.select("#superlocation-name"),
        divisionWord = d3.select("#division-word"),
        locationAttribution = infoDisplay.select("#location-geometry-attribution"),
        allNameDisplays = d3.selectAll("span.location-name"),
        allSubdivisionNameDisplays = d3.selectAll("span.subdivision-name"),
        locationColorInput = d3.select("#sublocation-submitter input[type=color]"),
        fetchToggler = d3.select("#fetch-toggler"),
        fetchDisplay = d3.select("#fetch-display"),
        fetchInput = fetchDisplay.select("#fetch-target"),
        fetchNameProperty = fetchDisplay.select("#fetch-name-property"),
        fetchProvider = fetchDisplay.select("#fetch-provider"),
        fetchAttributionLink = fetchDisplay.select("#fetch-attribution-link"),
        fetchResult = fetchDisplay.select("#fetch-result"),
        sublocationForm = document.querySelector("#new-sublocation-form");



  //================//
 // Initialization //
//================//

// Set defaults for the map and create variables for stable access
let activeLocation = {
    type: "feature",
    properties: {
        NAME: "Earth",
        sublocationWord: "country"
    },
    geometry: {
        "type": "Polygon",
        "coordinates": [[[-180, -90], [180, -90], [180, 90], [-180, 90]]]
    }
},
    activeParent = activeLocation,
    activeGeo = {
        type: "FeatureCollection",
        features: []
    },
    geoCache = {},
    activeVectorGrid,
    tempLayer,
    layerIsLoading = false,
    activeFeatureID;

// To-do: Initialization could be moved into this function and put into a button. This would decrease unintentional requests to the API, but also add a step for users.
function loadMap(){
    
}

// Initialize Leaflet (L) Map with double-click zoom turned off (we'll use double click for loading subfeatures and manually set the zoom level), the map slightly skewed from center, 
const mymap = L.map('map-display', {
    doubleClickZoom: false
}).setView([5, 10], 3);

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; various contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/streets-v11',
    continuousWorld: true,
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1IjoibWFnbm92YSIsImEiOiJja3J3MjNqbTgwY2Q4MnRwYTBkZHR3NG5hIn0.wruvW9k_X4QuoJHWhaYtFw'
}).addTo(mymap);

// initialize the popup interface
const popup = L.popup();

    //======//
   // Zoom //
  //======//==========================================================================//
 // Logic for a custom control that lets you traverse one level of locations upward //
//=================================================================================//

const zoomOutControl = L.control();
zoomOutControl.onAdd = function(mymap) {
    this._div = L.DomUtil.create('div', 'zoom-out-div'); // create a div with a class "info"
    this.update();
    return this._div;
};

// Update function is called when traversing a level, and is passed the word for the current administrative level
zoomOutControl.update = function(administrativeLevel) {
    this._div.innerHTML = (activeLocation === activeParent && !activeParent?.properties?.superlocation) ?
        "<h5>You're as high as you can be</h5>"
        : `<h4>Viewing each ${administrativeLevel || "subdivision"} of </h4><button class="control" onclick="zoomOutToParent();">${activeParent.properties.NAME}</button><br>`;
};
zoomOutControl.toggleHidden = function(hidingIt){
    if(hidingIt){
        L.DomUtil.addClass(this._div, "hidden");
    } else {
        L.DomUtil.removeClass(this._div, "hidden");
    }
};

zoomOutControl.addTo(mymap);


  //===================//
 // Loading Animation //
//===================//

const loadDisplay = L.control({position: "bottomleft"});
loadDisplay.onAdd = function(mymap){
    this._div = L.DomUtil.create("div", "loading-bar");
    this.update();
    return this._div;
}
loadDisplay.update = function(mode){
    if(mode === "start"){
        L.DomUtil.removeClass(this._div, "hidden");
    }
    if(mode === "stop"){
        L.DomUtil.addClass(this._div, "hidden");
    }
}
loadDisplay.addTo(mymap);


// This function could be used for an editing mode - to place a point and fill out a prompt.
// function onMapClick(e){
//     popup
//         .setLatLng(e.latlng)
//         .setContent("You clicked the map at " + e.latlng.toString() + " with zoom level " + mymap.getZoom())
//         .openOn(mymap);
// }

mymap.on('dblclick', onMapDoubleClick);
function onMapDoubleClick(e){
    if(!layerIsLoading){
        renderSublocations(activeLocation);
    }
}

startWithEarth();
async function startWithEarth(){
    const earth = await fetch("/locations/data/61278ac50ae7bf3ad8fb47f3")
        .then(handleErrors)
        .then(res => res.json())
        .catch(console.error);
    if(earth.message !== "OK"){
        // To-do: display this to user
        console.error(earth.message);
    } else {
        activeLocation = addToGeo(earth.content);
        activeParent = activeLocation;
        showLayer(activeGeo);
        // loadSublocations(activeParent);
        // readAllData(activeGeo.features);
    }
}

async function showCountries(){
    let results = await fetch("https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/10m/cultural/ne_10m_admin_0_countries.json")
        .then(handleErrors)
        .then(res => res.json())
        .then(res => {
            showLayer(res);
            readFeatureList(activeGeo.features);
            mymap.fitBounds(L.latLngBounds(collectPointsForLeaflet([], activeLocation.geometry.coordinates)));
            return res;
        })
        .then(console.log)
        .catch(console.error);
}

  //======//
 // AJAX //
//======//


if(sublocationForm){
    sublocationForm.addEventListener("submit", async e => {
        e.preventDefault();
        const newLocation = previewLocationSubmission();
        if(newLocation === false){
            return;
        } else {
            startLoadingLayer();
            let submittedFeature = await submitSublocation(newLocation, newLocation.geometrySource);
            finishLoadingLayer();
            renderNewSublocation(submittedFeature);
        }
    });
}

function previewLocationSubmission(){
    const   formInput = new FormData(sublocationForm),
            newLocation = {
                name: capitalize(formInput.get("name")),
                geometry: JSON.parse(formInput.get("geojson")),
                geometrySource: `©<a href="${formInput.get("location-attribution")}">${formInput.get("geo-provider")}</a>`,
                color: formInput.get("location-color"),
                sublocationWord: formInput.get("sublocation-word")
            }
    const confirmed = window.confirm("This is what you're about to submit. Look good?" + JSON.stringify(newLocation));
    if(confirmed){
        return newLocation;
    }
    else {
        return false;
    }
}

async function submitSublocation(feature, attribution){
    let newLocation;
    if(!feature || !activeParent){
        return;
    } else {
        newLocation = {
            geometry: feature.geometry,
            geometrySource: attribution,
            sublocationWord: feature.sublocationWord,
            superlocation: activeParent.properties._id
        };
        if(feature.name){
            newLocation.name = capitalize(feature.name);
        } else if(feature.properties.NAME) {
            newLocation.name = capitalize(feature.properties.NAME);
        }
        if(feature.color){
            newLocation.color = feature.color
        }
    }
    // console.log(JSON.stringify(newLocation));
    let result = await fetch("/locations", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLocation)
    })
        .then(handleErrors)
        .then(res => res.json())
        .catch(console.error);
    if(result.message !== "OK"){
        console.error(result.message);
        return false;
    } else {
        return result.content;
    }
}

function renderNewSublocation(submittedFeature){
    if(!geoCache[submittedFeature.superlocation._id]){
        updatedFeatureCollection = {
            type: "FeatureCollection",
            features: [],
            parent: activeParent
        };
        geoCache[submittedFeature.superlocation._id] = updatedFeatureCollection;
    }
    const formattedFeature = addToGeo(submittedFeature);
    geoCache[submittedFeature.superlocation._id].features.push(formattedFeature);
    document.querySelector("#map-display").scrollIntoView({behavior: "smooth"});
    showLayer(activeGeo);
}

async function fetchThis(){
    const parent = activeParent;
    fetch(`${fetchInput.property("value")}`)
        .then(handleErrors)
        .then(res => res.json())
        .then(res => {      
            res.parent = parent;
            for(feature of res.features){
                feature.properties.geometrySource = `©<a href="${fetchAttributionLink.property("value")}">${fetchProvider.property("value")}</a>`;
                feature.properties.NAME = capitalize(feature.properties[fetchNameProperty.property("value")]);
            }
            showLayer(res);
            activeGeo
            fetchResult.html(`<p>${res.features.length} sublocations detected</p>`)
            sublocationList.html(sublocationList.html() + `<button onclick="submitFetchedSublocations();">Submit ${activeGeo.features.length} sublocations</button>`);
            toggleToSublocationList();
            document.querySelector("#map-display").scrollIntoView({behavior: "smooth"});
            mymap.fitBounds(L.latLngBounds(collectPointsForLeaflet([], activeLocation.geometry.coordinates)));
            return res;
        })
        // .then(console.log)
        .catch(console.error);
}

async function submitFetchedSublocations(){
    let submittedFeatureCollection = {
        type: "FeatureCollection",
        features: [],
        parent: activeParent
    };
    const attribution = `©<a href="${fetchAttributionLink.property("value")}">${fetchProvider.property("value")}</a>`;
    startLoadingLayer();
    for(feature of activeGeo.features){
        const submittedFeature = await submitSublocation(feature, attribution);
        
        if(submittedFeature === false){
            continue;
        }
        const formattedFeature = {
            geometry: submittedFeature.geometry,
            properties: {
                NAME: submittedFeature.name,
                color: submittedFeature.color,
                geometrySource: submittedFeature.geometrySource,
                sublocationWord: submittedFeature.sublocationWord,
                superlocation: activeParent.properties._id
            },
            type: "Feature"
        };
        tempLayer.addLayer(L.geoJson(formattedFeature));
        submittedFeatureCollection.features.push(formattedFeature);
    }
    finishLoadingLayer();
    showLayer(submittedFeatureCollection);
    geoCache[submittedFeatureCollection.parent.properties._id] = activeGeo;
}

function updateColor(){
    const   newColor = colorEditor.property("value"),
            newColorNTC = ntc.name(newColor);
    if(!activeLocation.properties._id || !window.confirm(`Would you like to change the color of ${activeLocation.properties.NAME} to ${newColorNTC[1]} (${newColorNTC[0]})?`)){
        return;
    }
    fetch(`/locations/color/${activeLocation.properties._id}`, {
        method: "PUT",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            color: newColor
        })
    })
        .then(handleErrors)
        .then(res => res.text())
        .then(text => {
            if(text.charAt(0) === '#'){
                if(!activeGeo.parent && activeGeo.features.length === 1){
                    activeGeo.features[0].properties.color = text;
                } else {
                    const newlyPainted = geoCache[activeGeo.parent.properties._id].features.find(feature => feature.properties._id == activeLocation.properties._id);
                    newlyPainted.properties.color = text;
                }
                colorEditor.property("value", text);
                colorEditor.style("background-color", text);
                colorName.text(`(${ntc.name(text)[1]})`);

                showLayer(activeGeo);
            } else {
                // display a message to the user that it didn't work
                return;
            }
        })
        .catch(console.error);
}

  //============================//
 // Feature and layer handling //
//============================//

function startLoadingLayer(){
    layerIsLoading = true;
    animateLoading();
    zoomOutControl.toggleHidden(true);
    loadDisplay.update("start");
    if(activeVectorGrid){
        activeVectorGrid.remove();
    }
    tempLayer = new L.featureGroup();
    mymap.addLayer(tempLayer);
};
function finishLoadingLayer(){
    layerIsLoading = false;
    deanimateLoading();
    zoomOutControl.toggleHidden(false);
    loadDisplay.update("stop");
    mymap.removeLayer(tempLayer);
    tempLayer = undefined;
}

function showLayer(featureCollection){
    activeGeo = featureCollection;
    if(activeVectorGrid){
        activeVectorGrid.remove();
    }
    if(featureCollection?.parent?.properties?._id){
        geoCache[featureCollection.parent.properties._id] = activeGeo;
    }
    activeVectorGrid = L.vectorGrid.slicer(featureCollection, {
        vectorTileLayerStyles: {
            sliced: (properties) => {
                return {
                    "color": properties.color || "#9e50ba",
                    "fill": true,
                    "fillColor": properties.color || "#3ba853",
                    "weight": 5,
                    "opacity": 0.6,
                    "fillOpacity": 0.2
                };
            }
        },
        interactive: true,
        useCache: true,
	    crossOrigin: true,
        getFeatureId: function(f) {
            return f.properties.NAME;
        }
    })
        .on("mousemove", highlightFeature)
        .on("mouseout", resetHighlight)
        .on("click", zoomToFeature)
        .addTo(mymap);
    readFeatureList(featureCollection.features);
    zoomOutControl.update(activeParent.properties.sublocationWord);
}

async function renderSublocations(feature){
    toggleToSublocationList();
    if(!feature?.properties?._id){
        sublocationList.html("<h3>This location hasn't been registered in Magnova yet.</h3>");
        return;
    }
    allNameDisplays.text(feature.properties.NAME);
    allSubdivisionNameDisplays.text(feature.properties.sublocationWord || "subdivision");
    activeParent = feature;
    // Change the zoom out control to match the change in parent - if you click another feature it will be changed again.
    zoomOutControl.update(activeParent.properties.sublocationWord);
    if(feature?.properties?._id && feature?.properties?.sublocations?.length > 0){
        loadSublocations(feature);
    }
    else {
        sublocationList.html("<h3>No sublocations yet. You can add those below.</h3>");
    }
}

async function loadSublocations(feature){
    // If you're already loading (set a variable in a startLoading function) then return right away
    if(feature?.properties?.sublocations && feature?.properties?._id){
        if(geoCache[feature.properties._id]){ // ***************************************************************************** To-do: Also allow updates to the geocache
            activeGeo = geoCache[feature.properties._id];
        } else {
            activeGeo = {
                type: "FeatureCollection",
                features: [],
                parent: feature
            };
            
            // Start a loading animation here
            startLoadingLayer();
            
            // A fetch to test
            let result = await fetch (`/locations/sublocations/${feature.properties._id}`)
                .then(handleErrors)
                .then(res => res.json())
                .catch(console.error);
            if(result.message !== "OK"){
                console.error(`${result.message}\n${result.content}`);
            } else {
                for(sublocation of result.content){
                    sublocation.superLocation = feature.properties._id;
                    tempLayer.addLayer(L.geoJson(addToGeo(sublocation)));
                }
            }
            // Verified, but slow alternative to above fetch and processing
            // for(sublocation of feature.properties.sublocations){
            //     let result = await fetch(`/locations/data/${sublocation._id}`)
            //         .then(handleErrors)
            //         .then(res => res.json())
            //         .catch(console.error);
            //     if(result.message !== "OK"){
            //         console.error(result.message);
            //     } else {
            //         tempLayer.addLayer(L.geoJson(addToGeo(result.content)));
            //     }
            // }
            // End loading animation here
            finishLoadingLayer();
        }

        

        showLayer(activeGeo);
    } else {
        console.log("No sublocations");
        return;
    }
}

function addToGeo(feature){
    const formattedFeature = formatFeature(feature);
    activeGeo.features.push(formattedFeature);
    return formattedFeature;
}

function formatFeature(feature){
    const formattedFeature = {
        geometry: feature.geometry,
        properties: {
            NAME: feature.name,
            _id: feature._id,
            color: feature.color,
            geometrySource: feature.geometrySource,
            sublocationWord: feature.sublocationWord,
            WOE_ID: feature.WOE_ID,
            osm_admin_level: feature.osm_admin_level,
            superlocation: feature.superlocation,
            sublocationWord: feature.sublocationWord,
            sublocations: feature.sublocations,
            sublocationFeatureCollectionURL: feature.sublocationFeatureCollectionURL,
            info: feature.info,
            edits: feature.edits,
            version: feature.version,
            tags: feature.tags,
            resources: feature.resources,
            harms: feature.harms,
            talkpage: feature.talkpage,
            issues: feature.issues,
            projects: feature.projects,
            tasks: feature.tasks
        },
        type: "Feature"
    }
    return formattedFeature;
}

   //===========================//
  // Zoom =====================//
 // Level of detail traversal //
//===========================//
 
function zoomToFeature(e) {
    // If you set the active parent with renderSublocations (double click) but there were no sublocations to load, reset parent to the higher level when clicking any place.
    if(!geoCache[activeParent.properties._id] && activeParent.properties.superlocation){
        activeParent = activeGeo.parent;
        readFeatureList(activeGeo.features); // Do this to make sure that you remove the "submit fetched sublocations" button
        zoomOutControl.update(activeParent.properties.sublocationWord);
    }
    // Update the zoom control when you're traversing down a level of detail, which is when you click on a newly loaded feature. 
    // Make the actual change after activeLocation changes, because otherwise the update zoom function won't display a button to zoom out to earth.
    const needToUpdateZoom = (activeParent === activeLocation);
    
    let feature;
    if(typeof(e) === "string"){
        feature = activeGeo.features.find(feature => feature.properties.NAME == e);
    } else {
        feature = activeGeo.features.find(feature => feature.properties.NAME == e.layer.properties.NAME);
    }
    activeLocation = feature;
    
    if(needToUpdateZoom){
        zoomOutControl.update(activeParent.properties.sublocationWord);
    }
    // Idea for possible style change, though I'd want to figure out a way to generate colors within certain bounds (to make sure they display well with Magnova's styles)
    // if(feature.properties.color){
    //     document.documentElement.style.setProperty("--bodyGradient", "linear-gradient(-10deg, rgb(0, 148, 0), rgb(13, 125, 139), rgb(106, 19, 141), rgb(209, 105, 2))");
    // }

    // Position the map around the feature
    const bounds = L.latLngBounds(collectPointsForLeaflet([], feature.geometry.coordinates));
    mymap.fitBounds(bounds);
    
    // Display the location's info, and its superlocation in the zoom out control box
    displayFeatureInfo(activeLocation);
    toggleToLocationInfo();
}

async function zoomOutToParent(){
    // Handle different cases of zooming out: when you're already at the top level, when you're reaching the top, or when the superlocation has a superlocation of its own.
    if(!activeParent){
        // to-consider: even though this shouldn't be called by the user or when an active parent isn't there in the first place, it shouldn't proceed without activeParent set. Display a message for the user?
        return;
    }
    // Set the active location to the active parent (if you've just loaded subfeatures, activeParent = activeLocation and this is redundant)
    activeLocation = activeParent;
    
    // Replace activeParent with its superlocation.
    if(activeParent?.properties?.superlocation){
        // Gather data from cache if you have already loaded it.
        if(geoCache[activeParent.properties.superlocation]){
            activeParent = geoCache[activeParent.properties.superlocation].parent;
            renderSublocations(activeParent);
        } else {
            // fetch the parent's parent to populate its data
            const parentBuffer = await fetch(`/locations/data/${activeParent.properties.superlocation}`)
                .then(handleErrors)
                .then(res => res.json())
                .catch(console.error);
            if(parentBuffer.message !== "OK"){
                // to-do: pass this message to a display div.
                console.log(parentBuffer.message);
                console.log(parentBuffer.content);
            }
            else {
                // formatFeature was taken out of addToGeo so you can get a Leaflet-formatted feature without putting the parent layer onto the map where it would block its sublocations
                activeParent = formatFeature(parentBuffer.content);
                // Populate the siblings of the feature you're zooming out to (this will check if sublocations have already been loaded in loadSublocations, and update the zoom control)
                renderSublocations(activeParent);
            }
        }
    } else {
        // No parent means no division name, so don't pass a subdivision name to zoomOutControl.update
        zoomOutControl.update();
    }

    // Fit the map to the boundaries of this newly focused location
    const bounds = L.latLngBounds(collectPointsForLeaflet([], activeLocation.geometry.coordinates));
    mymap.fitBounds(bounds);

    // Display the location's info, and its superlocation in the zoom out control box
    displayFeatureInfo(activeLocation);
}

  //==================//
 // Display Updating //
//==================//

// Refactor this to use d3 and add interactivity + links
function readFeatureList(features){
    let displayText = `<h2>${ activeParent.properties.NAME }</h2> <ul>`;
    for(feature of features){
        if(feature != activeParent){
            displayText += `<li onmouseover="highlightFeature('${feature.properties.NAME}');" onmouseout="resetHighlight('${feature.properties.NAME}')" onclick="zoomToFeature('${feature.properties.NAME}');">${feature.properties.NAME}</li>`
        }
    }
    displayText += "</ul>";
    sublocationList.html(displayText);
}

// Call this to update the display's various fields.                                    *****************continue working on this
function displayFeatureInfo(feature){
    locationName.text(feature.properties.NAME);
    if(feature.properties._id){
        wikiButton.html(`<a href="/locations/${feature.properties._id}" target="_blank" rel="noopener noreferrer">Go to wiki</a>`);
        wikiButton.classed("greyed", false);
        colorEditor.classed("hidden", false);
        if(feature.properties.color){
            colorEditor.property("value", feature.properties.color);
            colorEditor.style("background-color", feature.properties.color);
            colorName.text(`(${ntc.name(feature.properties.color)[1]})`);
        } else {
            colorName.text("");
        }
        wikiButton.attr("title", `See local issues/projects/tasks, community information, and discussion at ${feature.properties.NAME}`);
    } else {
        wikiButton.html("Go to wiki");
        wikiButton.classed("greyed", true);
        colorEditor.classed("hidden", true);
        wikiButton.attr("title", "Location not yet registered");
    }
    if(activeLocation !== activeParent){
        superlocationName.text(activeParent.properties.NAME);
        divisionWord.text(activeParent.properties.sublocationWord || "subdivision");
    } else {
        superlocationName.text("the Solar System");
        divisionWord.text("planet");
    }
    locationAttribution.html(`Boundary data ${feature.properties.geometrySource}`);
}

// Messaging data to to the User
// __________


  //========================//
 // Style and UI functions //
//========================//

// Push the info aside and bring the sublocation list into view
function toggleToSublocationList(){
    sublocationContainer.classed("hidden", false);
    infoDisplay.classed("hidden", true);
}

// Push the sublocation list aside and bring the info into view
function toggleToLocationInfo(){
    infoDisplay.classed("hidden", false);
    sublocationContainer.classed("hidden", true);
}

if(locationColorInput){
    locationColorInput.on("change", () => {
        locationColorInput.style("background-color", locationColorInput.property("value"));
    })
}
if(colorEditor){
    colorEditor.on("change", () => {
        colorEditor.style("background-color", colorEditor.property("value"));
        updateColor();
    })
}

function toggleFetchDisplay(){
    const alreadyHidden = fetchDisplay.classed("hidden");
    fetchDisplay.classed("hidden", !alreadyHidden);
    if(alreadyHidden){
        document.querySelector('#fetch-display').scrollIntoView({behavior: 'smooth'});
    }
    fetchToggler.text(fetchToggler.text() === "Batch add direct sublocations →" ? "Batch add direct sublocations ←" : "Batch add direct sublocations →");
}

// Works if e is passed by mousemove event, AND if you pass a name string to it. Same for resetHighlight
function highlightFeature(e) { 
    if(e?.layer?.properties?.NAME && activeFeatureID !== e.layer.properties.NAME){
        resetHighlight(activeFeatureID);
        activeFeatureID = e.layer.properties.NAME;
        activeVectorGrid.setFeatureStyle(e.layer.properties.NAME, {
            weight: 5,
            color: '#c0eb4b',
            fill: true
            // fillOpacity: 0.6
        });
    } else if(typeof(e) === "string"){
        activeVectorGrid.setFeatureStyle(e, {
            weight: 5,
            color: '#c0eb4b',
            fill: true
            // fillOpacity: 0.6
        });
    }
}


function resetHighlight(e) {
    if(e?.layer?.properties?.NAME && activeFeatureID){
        activeVectorGrid.resetFeatureStyle(e.layer.properties.NAME);
        activeFeatureID = false;
    } else if(typeof(e) === "string"){
        activeVectorGrid.resetFeatureStyle(e);
        activeFeatureID = false;
    }
}

function capitalize(str){
    if(typeof(str) !== "string"){
        return;
    } else {
        const wordArray = str.split(" ");
        const newString = wordArray.reduce((acc, word, i) => {
            if(word.length > 0){
                if(i > 0){
                    acc += " ";
                }
                if(word.length > 1){
                    const formattedWord = word.charAt(0).toUpperCase() + word.slice(1, word.length).toLowerCase();
                    return acc + formattedWord;
                }
                else {
                    return acc + word.toUpperCase;
                }
            }
            else {
                return acc;
            }
        }, "");
        return newString;
    }
}

  //================//
 // Map middleware //
//================//

// I could not find a bounding function or preprocessor that did this
function collectPointsForLeaflet(pointsArray, geometry){ 
    for(let i = 0; i < geometry.length; i++){
        if(Array.isArray(geometry[i])){
            pointsArray = collectPointsForLeaflet(pointsArray, geometry[i]);
        }
        else {
            let point = [geometry[i+1], geometry[i]] // swap coordinates because geoJSON uses [long, lat] and leaflet uses [lat, long]
            // If the current longitude is more than 180deg away from previous, change it by 360deg.
            if(pointsArray.length > 0){
                let difference = point[1] - pointsArray[pointsArray.length - 1][1];
                if(difference > 180){
                    point[1] = point[1] - 360;
                }
                else if(difference < -180){
                    point[1] = point[1] + 360;
                }
            }
            pointsArray.push(point);
            i++;
        }
    }
    return pointsArray;
}


// Error handling
function handleErrors(res){
    if(!res.ok){
        throw Error(res.status);
    }
    return res;
}