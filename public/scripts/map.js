// const   fetchDisplay = d3.select("#fetch-display"),
//         fetchInput = fetchDisplay.select("#fetch-target"),
//         fetchResult = fetchDisplay.select("#fetch-result");

const   mapContainer = d3.select("#map-container"),
        infoDisplay = mapContainer.select("#location-info-display");

function loadMap(){
    
}

const mymap = L.map('map-display', {
    doubleClickZoom: false
}).setView([5, 10], 3);

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/streets-v11',
    continuousWorld: true,
    tileSize: 512,
    zoomOffset: -1,
    accessToken: 'pk.eyJ1IjoibWFnbm92YSIsImEiOiJja3J3MjNqbTgwY2Q4MnRwYTBkZHR3NG5hIn0.wruvW9k_X4QuoJHWhaYtFw'
}).addTo(mymap);

var popup = L.popup();

// function onMapClick(e){
//     popup
//         .setLatLng(e.latlng)
//         .setContent("You clicked the map at " + e.latlng.toString() + " with zoom level " + mymap.getZoom())
//         .openOn(mymap);
// }

function onMapDoubleClick(e){
    // To do:
    // focus the feature
    // if the feature that's double clicked has sublocations, then render those as a layer.

    popup
        .setLatLng(e.latlng)
        .setContent("Double clicked!")
        .openOn(mymap);
}

// mymap.on('click', onMapClick);
mymap.on('dblclick', onMapDoubleClick);

let activeGeo,
    activeVectorGrid,
    activeFeatureID;

async function showCountries(){
    let results = await fetch("https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/10m/cultural/ne_10m_admin_0_countries.json")
        .then(handleErrors)
        .then(res => res.json())
        .then(res => {
            showLayer(res);
            readAllData(activeGeo.features);
            return res;
        })
        .then(console.log)
        .catch(console.error);
}
showCountries();

async function fetchThis(){
    let results = await fetch(`${fetchInput.property("value")}`)
        .then(handleErrors)
        .then(res => res.json())
        .then(res => {
                showLayer(res);
                return res;
            })
        .then(console.log)
        .catch(console.error);
    // fetchResult.text(results);
}



function showLayer(featureCollection){
    activeGeo = featureCollection;
    activeVectorGrid = L.vectorGrid.slicer(featureCollection, {
        vectorTileLayerStyles: {
            sliced: {
                "color": "#9e50ba",
                "fill": true,
                "fillColor": "#3ba853",
                "weight": 5,
                "opacity": 0.7,
                "fillOpacity": 0.5
            }
        },
        interactive: true,
        getFeatureId: function(f) {
            return f.properties.NAME;
        }
    })
        .on("mousemove", highlightFeature)
        .on("mouseout", resetHighlight)
        .on("click", zoomToFeature)
        .addTo(mymap);
    // activeGeo = L.geoJSON(featureCollection, {
    //     style: {
    //         "color": "#9e50ba",
    //         "fillColor": "#3ba853",
    //         "weight": 5,
    //         "opacity": 0.7,
    //         "fillOpacity": 0.5
    //     },
    //     onEachFeature: onEachFeature
    // }).addTo(mymap);
}

// function onEachFeature(feature, layer) {
//     if (feature.properties && feature.properties.NAME) {
//         layer.bindPopup(feature.properties.NAME);
//     }
//     layer.on({
        
//     });
// }
function readAllData(features){
    let displayText = "<h2>Earth</h2> <ul>"
    for(feature of features){
        displayText += `<li>${feature.properties.NAME}</li>`
    }
    displayText += "</ul>";
    infoDisplay.html(displayText);
}

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
    
    }
}
function resetHighlight(e) {
    if(e?.layer?.properties?.NAME && activeFeatureID){
        activeVectorGrid.resetFeatureStyle(e.layer.properties.NAME);
        activeFeatureID = false;
    }
}
function zoomToFeature(e) {
    // console.log(activeGeo.features.find(feature => feature.properties.NAME == e.layer.properties.NAME))
    // var extent = turf.bbox(activeGeo.features.find(feature => feature.properties.NAME == e.layer.properties.NAME));
    // console.log([[extent[0], extent[1]],[extent[2], extent[3]]]);
    // if(extent[2] - extent[0] > 180)
    const feature = activeGeo.features.find(feature => feature.properties.NAME == e.layer.properties.NAME);
    const bounds = L.latLngBounds(collectPointsForLeaflet([], feature.geometry.coordinates));
    mymap.fitBounds(bounds);
    let displayHtml = `<h2>${feature.properties.NAME}</h2>`;
    infoDisplay.html(displayHtml);
}
// I could not find a bounding function or preprocessor
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

function handleErrors(res){
    if(!res.ok){
        throw Error(res.status);
    }
    return res;
}