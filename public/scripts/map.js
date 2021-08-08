const   fetchDisplay = d3.select("#fetch-display"),
        fetchInput = fetchDisplay.select("#fetch-target"),
        fetchResult = fetchDisplay.select("#fetch-result");

function loadMap(){
    
}

const mymap = L.map('map-container', {
    doubleClickZoom: false
}).setView([5, 10], 3);

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/streets-v11',
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
async function showCountries(){
    let results = await fetch("https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/10m/cultural/ne_10m_admin_0_countries.json")
        .then(handleErrors)
        .then(res => res.json())
        .then(res => {
            showLayer(res.features);
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
                showLayer(res.features);
                return res;
            })
        .then(console.log)
        .catch(console.error);
    // fetchResult.text(results);
}

let activeGeo;

function showLayer(featureCollection){
    activeGeo = L.geoJSON(featureCollection, {
        style: {
            "color": "#9e50ba",
            "fillColor": "#3ba853",
            "weight": 5,
            "opacity": 0.7,
            "fillOpacity": 0.5
        },
        onEachFeature: onEachFeature
    }).addTo(mymap);
}
function onEachFeature(feature, layer) {
    if (feature.properties && feature.properties.NAME) {
        layer.bindPopup(feature.properties.NAME);
    }
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: zoomToFeature
    });
}

function highlightFeature(e) {
    const layer = e.target;

    layer.setStyle({
        weight: 5,
        color: '#c0eb4b',
        // fillOpacity: 0.6
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
}
function resetHighlight(e) {
    activeGeo.resetStyle(e.target);
}
function zoomToFeature(e) {
    mymap.fitBounds(e.target.getBounds());
}

function handleErrors(res){
    if(!res.ok){
        throw Error(res.status);
    }
    return res;
}