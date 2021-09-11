const   mymap = L.map("map-display").setView([5, 10], 3),
        newParentToggler = d3.select("#new-parent-search-toggler"),
        newParentSearchbar = d3.select("#parent-search-bar"),
        newParentSearchForm = document.querySelector("#parent-replacement-form"),
        newParentResultDisplay = newParentSearchbar.select("#adoption-search-results"),
        parentLink = d3.selectAll("a.superlocation-link");

let thisGeo,
    newParentResultSelection,
    // minimap.js is loaded for a single location of focus where it's preferable to work with Magnova-formatted data:
    staticLocation,
    activeFeature,
    colorEditor;

initializeMiniMap();


// Event listeners
if(newParentSearchForm){
    newParentSearchForm.onsubmit = e => {
        e.preventDefault();
        e.stopPropagation();
        findNewParents();
    }
};


const mapLink = L.control();
mapLink.onAdd = function(mymap) {
    this._div = L.DomUtil.create('div', 'link-to-maps'); // create a div with a class "info"
    this._div.innerHTML = `<a href="/locations">Go to Maps</a>`
    return this._div;
};
mapLink.addTo(mymap);


// Color editor that shows up in the minimap
const colorControl = L.control();
if(!d3.select("#username").empty()){
    colorControl.onAdd = function(mymap){
        this._div = L.DomUtil.create("div", "color-editing-box");
        this._div.innerHTML = `<h4>Change location color:</h4><input type="color" id="color-editor">`;
        return this._div;
    }
    colorControl.addTo(mymap);

    colorEditor = d3.select("#color-editor");
    colorEditor.on("change", () => {
        colorEditor.style("background-color", colorEditor.property("value"));
        updateColor();
    });
}

async function initializeMiniMap(){
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Tiles &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        useCache: true,
	    crossOrigin: true
    }).addTo(mymap);
    result = await fetch(`/locations/data/${topicID}`)
        .then(handleErrors)
        .then(res => res.json());
    if(result.message !== "OK"){
        console.error(`${result.message}\n\n${result.content}`);
    } else {
        staticLocation = result.content;
    }
    if(staticLocation){
        thisGeo = {
            geometry: staticLocation.geometry,
            properties: {
                color: staticLocation.color
            },
            type: "Feature"
        };
    } else {
        thisGeo = {
            geometry: JSON.parse(d3.select("#hidden-geojson").text()),
            type: "Feature"
        }
    }
    activeFeature = L.geoJson(thisGeo, {
        style: styleFeature
    }).addTo(mymap);
    
    const bounds = L.latLngBounds(collectPointsForLeaflet([], thisGeo.geometry.coordinates));
    mymap.fitBounds(bounds);
}

function toggleParentSearchbar(){
    const alreadyHidden = newParentSearchbar.classed("hidden");
    if(alreadyHidden){
        newParentToggler.text("Cancel replacement");
        newParentSearchbar.classed("hidden", false);
    } else {
        newParentToggler.text("Replace parent");
        newParentSearchbar.classed("hidden", true);
    }
}
async function findNewParents(){
    let parentSearchResults = await fetch(`/wiki/search?locations=true&target=${d3.select("#parent-replacement-input").property("value")}`)
        .then(handleErrors)
        .then(res => res.json())
        .catch(err => {
            console.error(err);
        });
    if(parentSearchResults.locations && parentSearchResults.locations.length > 0){
        locationResultHeader.classed("hidden", false);
    }
    newParentResultSelection = newParentResultDisplay.selectAll(".search-result")
        .data(parentSearchResults.locations, d => d._id);
    let locationResultsEnter = newParentResultSelection
        .enter()
        .append("div")
            .classed("search-result", true);
    locationResultsEnter
        .append("h4")
            .classed("result-name", true)
            .text(location => {
                let childAndParent = "";
                if(location?.name.length > 50){
                    childAndParent += `${location.name.slice(0, 46)}...` ;
                }
                else{ childAndParent += location.name; }
                childAndParent += " of ";
                if(location.superlocation.name > 50 ){
                    childAndParent += `${location.superlocation.name.slice(0, 46)}...`;
                } else { childAndParent += location.superlocation.name; }
                return childAndParent;
            })
            .on("click", location => adopt(location, staticLocation));
    newParentResultSelection.exit()
        .classed("leaving", true)
        .transition(0)
        .delay(500)
        .remove();
    newParentResultSelection = newParentResultSelection.merge(locationResultsEnter);
}
function adopt(newParent, child){
    if(window.confirm(`Are you sure you want to change ${child.name}'s parent from ${child.superlocation.name} to ${newParent.name}?`)){
        fetch(`/locations/adopt/${newParent._id}/${child._id}`, {
            method: "PUT"
        })
            .then(handleErrors)
            .then(res => res.json())
            .then(res => {
                if(res.message !== "OK"){
                    // add in a message to user here
                    console.error(`${res.message}\n\n${res.content}`);
                } else {
                    parentLink.attr("href", `/locations/${res.content._id}`);
                    parentLink.text(res.content.name);
                    newParentToggler.text("Replace parent");
                    newParentSearchbar.classed("hidden", true);
                }
            });
    }
}

function styleFeature(feature){
    return {
        fillColor: feature.properties.color || "#3388ff",
        fillOpacity: .2,
        color: feature.properties.color || "#3388ff",
        opacity: .6
    };
}
function updateColor(){
    const   newColor = colorEditor.property("value"),
            newColorNTC = ntc.name(newColor);
    if(!staticLocation._id || !window.confirm(`Would you like to change the color of ${staticLocation.name} to ${newColorNTC[1]} (${newColorNTC[0]})?`)){
        return;
    }
    fetch(`/locations/color/${staticLocation._id}`, {
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
                activeFeature.setStyle(styleFeature({properties: {color: text}}));
            } else {
                // display a message to the user that it didn't work
                return;
            }
        })
        .catch(console.error);
}

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