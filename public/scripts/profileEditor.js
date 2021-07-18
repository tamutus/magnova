// TO DO
// Change serialize and deserialize user functions so username can be changed
//      https://stackoverflow.com/questions/24023443/passport-local-mongoose-when-i-update-a-records-username-im-logged-out-why



let editing = false,
    styleVars = document.documentElement;

// Get user data from server


// Capture display fields
const names = d3.select("#names"),
    preferredName = names.select("h1.preferred-name"),
    handle = names.select("h3.handle"),
    emailBox = d3.select("#email-box"),
    emailDisplay = emailBox.select("#email-display"),
    pfp = d3.select("#pfp-container").select("#profile-picture")
    bioText = d3.select("#bio-text"),
    dataDisplays = d3.selectAll(".data"),
    // Capture Edit button;
    editButton = d3.select("#edit-button"),
    cancelButton = d3.select("#cancel-button"),
    messageSpan = d3.select("#return-message");

let currentUser = fetch("/auth/my_data")
    .then(res => res.json())
    // .then(res => console.log(res))
    .catch((error) => {
        console.error('Error:', error);
    });

// Add and capture hidden input fields on top of display fields
const preferredNameInput = d3.select("#names")
    .insert("input",":first-child")
        .attr("type", "text")
            .property("value", preferredName.text())
        .classed("preferred-name", true)
        .classed("mutable", true)
        .classed("hidden", true);
const emailInput = d3.select("#email-box")
    .append("input")
        .attr("type", "text")
            .property("value", emailDisplay.text())
        .classed("handle", true)
        .classed("mutable", true)
        .classed("hidden", true);
const imageInput = d3.select("#pfp-container").
    append("input")
        .attr("type", "text")
            .property("value", d3.select("#profile-picture").attr("src"))
        .attr("id", "pfp-input")
        .classed("mutable", true)
        .classed("hidden", true);
// Get one selection for both above inputs
const inputs = d3.selectAll("input.mutable");

// Capture the DOM elements for the bioeditor
const bioEditorContainer = d3.select("#bio").select("#bio-editor-container");
const bioEditor = d3.select("#bio").select("#bio-editor");

// Turn on TinyMCE text editor 
let tinyInput, tinyAppBox;
tinymce.init({
    selector: '#bio-editor',
    plugins: 'autosave emoticons autoresize fullscreen link',
    // menubar: 'view',
    toolbar: 'fullscreen link',
    max_height: 800,
    setup: editor => {
        editor.on('init', function() {
            tinyInput = d3.select("#tinymce");
            tinyAppBox = bioEditorContainer.select("div.tox.tox-tinymce");
            styleVars.style.setProperty('--editorHeight', `${tinyAppBox.style("height")}`);
        });
        editor.on("input", e => {
            styleVars.style.setProperty('--editorHeight', `${tinyAppBox.style("height")}`);
            console.log(bioEditorContainer.style("height"));
        });
    }
});

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
        tinymce.activeEditor.setContent(bioText.html());
        // Adjust the height of the editor container
        styleVars.style.setProperty('--editorHeight', `${tinyAppBox.style("height")}`);
        // Hide display fields and show input fields, bio editor, and cancel-editing button
        dataDisplays.classed("hidden", true);
        pfp.classed("shrunk", true);
        inputs.classed("hidden", false);
        bioEditorContainer.classed("hidden", false);
        cancelButton.classed("hidden", false);
    }
    // Save changes
    else{
        let bioHTML = tinymce.activeEditor.getContent();
        profileUpdate = {
            preferredName: preferredNameInput.property("value"),
            email: emailInput.property("value"),
            bio: bioHTML,
            pfpLink: imageInput.property("value")
        };
        
        // Make an API call to get current user info to be up-to-date, then save the profile, returning and dislaying any error messages
        currentUser = await fetch("/auth/my_data")
            .then(res => res.json())
            .catch((error) => {
                console.error('Error:', error);
            });
        let response = await fetch("/auth/my_data", {
            method: "PUT",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(profileUpdate)
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
        preferredName.text(profileUpdate.preferredName);
        // handle.text(`@ ${profileUpdate.username}`);  // username changes need to be implemented
        bioText.html(profileUpdate.bio);
        emailDisplay.text(profileUpdate.email);
        pfp.attr("src", profileUpdate.pfpLink);
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
    bioEditorContainer.classed("hidden", true);
    
    cancelButton.classed("hidden", true);
    pfp.classed("shrunk", false);
}
function toggleField(id){
    
    // let fieldType = 
}
function displayMessage(message){
    messageSpan.text(message);
    messageSpan.classed("revealed", false);
    messageSpan.classed("revealed", true);
}