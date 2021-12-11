let editing = false,
    rolling = false,
    version = Number(d3.select("#current-version-count").text()),
    revisionVersion = version;
    styleVars = document.documentElement;

// The below code is in wiki.js
// // Capture topic id
// const   issueIdDiv = d3.select("#hidden-issue-id"),
//         projectIdDiv = d3.select("#hidden-project-id"),
//         taskIdDiv = d3.select("#hidden-task-id");
// let topicID,
//     routeBase;

// if(!issueIdDiv.empty()){ 
//     topicID = issueIdDiv.text(); 
//     routeBase = "wiki";
// }
// else if(!projectIdDiv.empty()){
//     topicID = projectIdDiv.text(); 
//     routeBase = "project";
// }
// else if(!taskIdDiv.empty()){
//     topicID = taskIdDiv.text();
//     routeBase = "task";
// }

// Capture display fields
const nameBox = d3.select("#name-container"),
    topicName = nameBox.select("h1"),
    imageBox = d3.select("#image-container"),
    topicImage = imageBox.select("#topic-image")
    descriptionText = d3.select("#description-text"),
    dataDisplays = d3.selectAll(".data"),
    subWordBox = d3.select("#sub-word-container"),
    subWordEmptyMessage = subWordBox.select("em.empty-message"),
    sublocationWord = subWordBox.select(".data"),
    geoBox = d3.select("#geo-container"),
    // Capture Editing buttons;
    editButton = d3.select("#edit-button"),
    cancelButton = d3.select("#cancel-button"),
    messageSpan = d3.select("#return-message"),
    versionCount = d3.select("#current-version-count"),
    revisionVersionCount = d3.select("#revision-version-count"),
    revisionMetadata = d3.select("#revision-metadata"),
    editLoader = d3.select("#edit-loader"),
    rollingTray = d3.select("#rolling-tray"),
    revisionText = d3.select("#revision-display").select("#revision-text");

let liveVersion,
    editID, 
    patchData,
    // These inputs will only be added on project and issue pages
    imageInput,
    // These inputs will only be added on location pages
    subWordInput,
    geoInput,
    geoProviderInput,
    geoAttributionInput;

const editIdDiv = d3.select("#hidden-patchlist-id");
if(!editIdDiv.empty()){
    editID = editIdDiv.text();
}

// let currentUser = fetch("/auth/my_data")
//     .then(res => res.json())
//     // .then(res => console.log(res))
//     .catch((error) => {
//         console.error('Error:', error);
//     });

// Add and capture hidden input fields on top of display fields
const nameInput = d3.select("#name-container")
    .insert("input",":first-child")
        .attr("type", "text")
            .property("value", topicName.text())
        .classed("topic-name", true)
        .classed("mutable", true)
        .classed("hidden", true);

// For issue and project pages:
if(!imageBox.empty()){
    imageInput = imageBox
        .append("input")
            .attr("placeholder", "Image URL")
            .attr("type", "text")
                .property("value", d3.select("#topic-image").attr("src"))
            .attr("id", "image-input")
            .classed("mutable", true)
            .classed("hidden", true);
}
// For location pages: 
if(!subWordBox.empty()){
    subWordInput = subWordBox
        .append("input")
            .attr("type", "text")
                .property("value", sublocationWord.text())
            .classed("sublocation-word", true)
            .classed("mutable", true)
            .classed("hidden", true);
    
}

// Get one selection for both above inputs
const inputs = d3.selectAll("input.mutable");

// Capture the DOM elements for the article editor
const descriptionEditorContainer = d3.select("#description").select("#description-editor-container");
const desriptionEditor = descriptionEditorContainer.select("#description-editor");

// Turn on TinyMCE text editor 
let tinyInput, tinyAppBox;

tinymce.init({
    selector: '#description-editor',
    plugins: 'emoticons autoresize fullscreen link',
    toolbar: 'fullscreen link',
    max_height: 1000,
    setup: editor => {
        editor.on('init', function() {
            tinyInput = d3.select("#tinymce");
            tinyAppBox = descriptionEditorContainer.select("div.tox.tox-tinymce");
            styleVars.style.setProperty('--editorHeight', `${tinyAppBox.style("height")}`);
        });
        editor.on("input", e => {
            styleVars.style.setProperty('--editorHeight', `${tinyAppBox.style("height")}`);
        });
    }
});

// Capture some TinyMCE elements


// Have the editor container resize with TinyMCE's autoresize

async function toggleEditing(){
    if(!editing){
        editing = true;
        // Activate editing functionality
        editButton.select("button").text("Save");
        // Add an event listener for navigating away from page to prevent changes from being lost.
        window.onbeforeunload = function(e){
            return "Changes are unsaved. Would you still like to leave?";
        };
        // Put bio into the text editor
        tinymce.get("description-editor").setContent(descriptionText.html());
        // Hide display fields and show input fields, bio editor, and cancel-editing button
        dataDisplays.classed("hidden", true);
        // issueImage.classed("shrunk", true);
        inputs.classed("hidden", false);
        descriptionEditorContainer.classed("hidden", false);
        cancelButton.classed("hidden", false);
    }
    // Save changes
    else{
        
        // Make an API call to get a live version of info for a three way merge with what you started editing and your edits, then save, returning and displaying any error messages.
        
        const dataRoute =   routeBase == "wiki" ? "issue" : routeBase;
        liveVersion = await fetch(`/${dataRoute}/data/${topicID}`)
            .then(serverResponse => serverResponse.json())
            .then(resObject => {
                console.log(resObject);
                if(resObject.message){
                    if(resObject.message === "OK"){
                        return resObject.content;
                    }
                    else {
                        console.error(resObject.message);
                        throw resObject.content;
                    }
                } else {
                    return resObject;
                }
            })
            .catch(error => {
                displayMessage("Couldn't get the live data");
                console.error('Error:', error);
            });

        if(!liveVersion){return;}
        // Three way merge logic
        let oldInfo = descriptionText.html(),
            newInfo = tinymce.get("description-editor").getContent(),
            liveInfo = liveVersion.info || "";
        console.log(`Old: ${oldInfo}, New: ${newInfo}, Live: ${liveInfo}`);
        const merged = Textmerger.get().merge(oldInfo, newInfo, liveInfo);
        console.log(`Merged: ${merged}`);
        
        // version = patchData.length + 1;
        // versionDisplay.text(`Version: ${version}`);
        // finalStuff.html(merged);
        // editedTextArea.property("value", merged);
        // sourceTextArea.html(merged);
        
        
        // patchData.push(JSON.stringify(patch));
        // displayPatches();
        // return;
        
        // Logic for recording the change.
        const   patch = Diff3.diffPatch(liveInfo, merged),
                patchYields = Diff3.patch(liveInfo, patch).join(""),
                invertedPatch = Diff3.invertPatch(patch),
                invertedPatchYields = Diff3.patch(merged, invertedPatch).join("");

        // Collect info to post into an object called topicUpdate
        let topicUpdate;
        if(routeBase === "project" || routeBase === "wiki"){
            topicUpdate = {
                name: nameInput.property("value"),
                info: merged,
                image: imageInput.property("value"),
                patch: patch,
                latestVersion: liveVersion.version
            };
        } 
        else if(routeBase === "locations"){
            topicUpdate = {
                name: nameInput.property("value"),
                info: merged,
                sublocationWord: subWordInput.property("value"),
                patch: patch,
                latestVersion: liveVersion.version
            }
        }
        if(patchYields !== merged){
            window.alert("There was an error updating content. A bug has been detected and a report submitted. We've saved your edits. If you were planning to make more, hold onto them until we fix the issue.");
            reportBug({
                link: window.location.pathname,
                text: `The previous version "${liveInfo}" \n\n wasn't updated to ${merged} \n\n because the inverted patch didn't match the live version (but the patched version did match the merge result). \n\n Patch: \n\n ${JSON.stringify(patch, null, 4)} \n\n Yields \n\n ${patchYields} \n\n Inverted Patch:\n\n ${JSON.stringify(invertedPatch, null, 4)} \n\n Yields \n\n ${invertedPatchYields}`
            });
            return;
        }
        if(liveVersion.info && liveVersion.info !== invertedPatchYields){
            window.alert("This edit can't be backwards patched and would corrupt the data. A bug has been detected and a report submitted.");
            reportBug({
                link: window.location.pathname,
                text: `The previous version "${liveInfo}" \n\n wasn't updated to ${merged} \n\n because the inverted patch didn't match the live version (but the patched version did match the merge result). \n\n Patch: \n\n ${JSON.stringify(patch, null, 4)} \n\n Yields \n\n ${patchYields} \n\n Inverted Patch:\n\n ${JSON.stringify(invertedPatch, null, 4)} \n\n Yields \n\n ${invertedPatchYields}`
            });
            return;
        }
        let response = await fetch(`/${routeBase}/${topicID}`, {
            method: "PUT",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(topicUpdate)
        })
        .then(serverResponse => serverResponse.text())
        .then(serverMessage => {
            displayMessage(serverMessage);
            return serverMessage;
        })
        .catch(error => {
            displayMessage("That didn't work!")
            console.error('Error:', error);
        });
        console.log(response);
        // Check response status code
        // With failure code, change the failure message div's text but otherwise return from this function
        
        //Success 
        topicName.text(topicUpdate.name);
        // handle.text(`@ ${topicUpdate.username}`);  // username changes need to be implemented
        descriptionText.html(topicUpdate.info);
        
        // For issue and project pages, which have a topic image:
        if(!topicImage.empty()){
            topicImage.attr("src", topicUpdate.image);
        }
        // For locations...
        if(!sublocationWord.empty()){
            sublocationWord.text(topicUpdate.sublocationWord);
            if(topicUpdate.sublocationWord){
                subWordEmptyMessage.classed("hidden", true);
            } else {
                subWordEmptyMessage.classed("hidden", false);
            }
        }

        stopEditing();
    }
}
// When you're viewing a location and want to change the geometry, 
function submitGeometry(){
    let geometryUpdate = {
        geometry: geoInput.property("value"),
        geometrySource: `©<a href="${geoAttributionInput.property("value")}">${geoProviderInput.property("geo-provider")}</a>`,
    };

}
function stopEditing(){
    // Remove event listener for navigating away from page.
    window.onbeforeunload = () => {};
    editButton.select("button").text("Edit page");
    editing = false;
    // Show display fields and hide input fields
    dataDisplays.classed("hidden", false);
    inputs.classed("hidden", true);
    descriptionEditorContainer.classed("hidden", true);
    
    cancelButton.classed("hidden", true);
    // issueImage.classed("shrunk", false);
}
async function toggleRolling(){
    if(!rolling){
        rolling = true;
        rollingTray.classed("hidden", false);
        styleVars.style.setProperty('--editorHeight', `500px`);
        
        if(!patchData){
            const dataRoute = routeBase == "wiki" ? "issue" : routeBase;
            liveResponse = fetch(`/${dataRoute}/data/${topicID}`)
                .then(serverResponse => serverResponse.json())
                .catch(error => {
                    displayMessage("Couldn't get the live data");
                    console.error('Error:', error);
                });
            const patchResponse = fetch(`/wiki/edits/${editID}`)
                .then(serverResponse => serverResponse.json())
                .catch(error => {
                    displayMessage("Couldn't get the live data");
                    console.error('Error:', error);
                });
            Promise.all([liveResponse, patchResponse]).then(values => {
                if(values[1].message !== "Success!"){ 
                    stopRolling();
                    return;
                }
                liveVersion = values[0];
                patchData = values[1].content;
                
                if(liveVersion.version !== version){
                    if(editing){
                        window.alert("While you've been editing, this document's About section has been updated. You can still submit those edits, just check to make sure the three-way merge algorithm was performed correctly. You could also refresh.");
                    } else {
                        descriptionText.html(liveVersion.info);
                    }
                }
                version = liveVersion.version;
                versionCount.text(version)
                revisionVersion = version;
                revisionVersionCount.text(revisionVersion);

                revisionText.html(liveVersion.info);
                displayRevisionMetadata();
            });
        }
    } else {
        stopRolling();
    }
}
function stopRolling(){
    rolling = false;
    rollingTray.classed("hidden", true);
}
function rollBack(){
    if(revisionVersion <= 0){
        window.alert("This is the earliest version. You can't roll back anymore!");
        return;
    }
    revisionVersion--;
    const patchBox = patchData.patches[revisionVersion];
    const invertedPatch = Diff3.invertPatch(patchBox.patch);
    const rolledBack = Diff3.patch(revisionText.html(), invertedPatch).join("");

    displayRevisionMetadata();

    revisionVersionCount.text(revisionVersion);
    revisionText.html(rolledBack);
}
function rollForward(){
    if(revisionVersion >= version){
        window.alert("You've reached the latest version! No more rolling.");
        return;
    }
    const patchBox = patchData.patches[revisionVersion];
    const parsedPatch = patchBox.patch;
    const rolledForward = Diff3.patch(revisionText.html(), parsedPatch).join("");
    
    revisionVersion++;
    displayRevisionMetadata();
    
    revisionVersionCount.text(revisionVersion);
    revisionText.html(rolledForward);
}
function displayRevisionMetadata(){
    const metadata = {};
    if(revisionVersion > 0){
        metadata.editor = patchData.patches[revisionVersion - 1].editor.username;
        metadata.editDate = patchData.patches[revisionVersion - 1].editDate;
    } else {
        if(liveVersion.identifier){
            metadata.editor = liveVersion.identifier.username;
        }
        else if (liveVersion.creator){
            metadata.editor = liveVersion.creator.username;
        }
        if(liveVersion.identificationDate){
            metadata.editDate = liveVersion.identificationDate;
        }
        else if (liveVersion.creationDate){
            metadata.editDate = liveVersion.creationDate;
        }
    }
    revisionMetadata.html(`<a href="/users/${metadata.editor}">${metadata.editor}</a> submitted this version on ${new Date(metadata.editDate).toLocaleDateString()}`);
}
function rollSave(){
    // To be implemented
}
function toggleField(id){
    
    // let fieldType = 
}
function displayMessage(message){
    messageSpan.classed("revealed", false);
    void messageSpan.node().offsetWidth;
    messageSpan.text(message);
    messageSpan.classed("revealed", true);
}