let editing = false,
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
    // Capture Editing buttons;
    editButton = d3.select("#edit-button"),
    cancelButton = d3.select("#cancel-button"),
    messageSpan = d3.select("#return-message");

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
        .classed("issue-name", true)
        .classed("mutable", true)
        .classed("hidden", true);
const imageInput = imageBox.
    append("input")
        .attr("type", "text")
            .property("value", d3.select("#topic-image").attr("src"))
        .attr("id", "image-input")
        .classed("mutable", true)
        .classed("hidden", true);
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
        let descriptionHTML = tinymce.get("description-editor").getContent();
        topicUpdate = {
            name: nameInput.property("value"),
            info: descriptionHTML,
            image: imageInput.property("value")
        };
        
        // Make an API call to get current user info to be up-to-date, then save the profile, returning and dislaying any error messages
        let response = await fetch(`/${routeBase}/${topicID}`, {
            method: "PUT",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(topicUpdate)
        })
        .then(serverResponse => serverResponse.text())
        .then(serverMessage => {
            displayTaskMessage(serverMessage);
            return serverMessage;
        })
        .catch(error => {
            displayTaskMessage("That didn't work!")
            console.error('Error:', error);
        });
        console.log(response);
        // Check response status code
        // With failure code, change the failure message div's text but otherwise return from this function
        
        //Success 
        topicName.text(topicUpdate.name);
        // handle.text(`@ ${topicUpdate.username}`);  // username changes need to be implemented
        descriptionText.html(topicUpdate.info);
        
        topicImage.attr("src", topicUpdate.image);
        stopEditing();
    }
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
function toggleField(id){
    
    // let fieldType = 
}
function displayTaskMessage(message){
    messageSpan.classed("revealed", false);
    void messageSpan.node().offsetWidth;
    messageSpan.text(message);
    messageSpan.classed("revealed", true);
}