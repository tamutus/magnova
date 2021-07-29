const   newTaskForm = document.querySelector("#task-submission form"),
        taskList = d3.select("#task-list"),
        taskViewer = d3.select("#task-viewer"),
        taskDisplay = d3.select("#task-display"),
        taskButtons = taskViewer.select("#task-buttons"),
        taskEditButton = taskButtons.select("#task-edit-button"),
        taskCancelButton = taskButtons.select("#task-cancel-button"),
        taskMessageSpan = taskButtons.select("#task-return-message"),
        taskNameDisplay = taskDisplay.select("#task-name"),
        taskInfoDisplay = taskDisplay.select("#task-info-container"),
        taskCreationDisplay = taskDisplay.select("#task-creation"),
        taskCompletionDisplay = taskDisplay.select("#task-completion"),
        taskDataDisplays = taskDisplay.selectAll(".task-data"),
        rootStyle = document.documentElement;

window.addEventListener('resize', updateDimensions);
updateDimensions();
function updateDimensions(){
    rootStyle.style.setProperty('--vw', `${window.innerWidth/100}`);
    rootStyle.style.setProperty('--vh', `${window.innerHeight/100}`);
}

let taskSelection, activeTask;

if(newTaskForm){
    newTaskForm.addEventListener("submit", e => {
        e.preventDefault();
        createTask();
    });
}
if(routeBase === "project" && topicID){
    taskList.html("");
    displayTasks(topicID);
}

async function displayTasks(projectID){
    let fetchData = await fetch(`/project/data/${projectID}`)
        .then(res => handleErrors(res))
        .then(res => res.json())
        .catch(err => {
            console.log(err)
        });
    if(fetchData?.tasks?.edges){
        displayTheseTasks(fetchData.tasks);
    }
};
function displayTheseTasks(taskgraph){
    taskSelection = taskList.selectAll("li.task")
        .data(taskgraph.edges);
    let taskEnter = taskSelection.enter()
        .append("li")
        .classed("task", true)
        .attr("id", taskEdge => `task-${taskEdge.vertex._id}`)
        .text(taskEdge => taskEdge.vertex.name)
        .on("click", taskEdge => displayThisTask(taskEdge.vertex));
    taskSelection.exit().remove();
    taskSelection = taskEnter.merge(taskSelection);
}
function displayThisTask(task){
    activeTask = task;
    if(!task){
        taskNameDisplay.select("h3").text("None");
        taskCreationDisplay.html("");
        taskCompletionDisplay.select("div").select("p").text();
        d3.select("#task-info-text").html();
        taskButtons.classed("hidden", true);
    } else {
        taskList.select(".active").classed("active", false);
        d3.select(`#task-${task._id}`).classed("active", true);
        taskNameDisplay.select("h3").text(task.name);
        taskCreationDisplay.html(`<p>Created on ${new Intl.DateTimeFormat('en-US', {year: 'numeric', month: 'numeric', day: 'numeric', hour: "numeric", minute: "numeric", timeZoneName: 'short'}).format(Date.parse(task.creationDate))} by <a href="/users/${task.creator.username}">${task.creator.username}</a></p>`);
        taskCompletionDisplay.select("div").select("p").text(task.completionRequirements);
        d3.select("#task-info-text").html(task.info);
        if(!d3.select("#logged-in").empty()){
            taskButtons.classed("hidden", false);
        }
    }
}
async function createTask(){
    if(routeBase === "project"){
        let formInput = new FormData(newTaskForm);
        let newTask = {
            name: formInput.get("name"),
            info: formInput.get("info"),
            completionRequirements: formInput.get("completionRequirements"),
        };
        fetch(`/project/addtask/${topicID}`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newTask)
        })
        .then(res => handleErrors(res))
        .then(res => res.json())
        .then(task => {
            displayTasks();
            displayThisTask(task);
        })
        .catch(err => {
            console.log(err)
        });

    }
}

// Add and capture hidden input fields on top of display fields
const taskNameInput = taskNameDisplay
    .insert("input",":first-child")
        .attr("type", "text")
        .classed("task-input", true)
        .classed("hidden", true);
const taskCompletionInput = taskCompletionDisplay
    .append("textarea")
        .classed("task-input", true)
        .classed("hidden", true);
const taskInfoInput = taskInfoDisplay.select("#task-info-editor-container")
    .append("textarea")
        .attr("id", "task-info-editor");
// Get one selection for both above inputs
const taskInputs = d3.selectAll(".task-input");

// Capture the DOM elements for the article editor
const taskDescriptionEditor = taskInfoDisplay.select("#task-info-editor");

let editingTask = false;
let taskTinyAppBox;

tinymce.init({
    selector: '#task-info-editor',
    plugins: 'emoticons autoresize fullscreen link',
    toolbar: 'fullscreen link',
    max_height: 800,
    setup: editor => {
        editor.on('init', function() {
            taskTinyAppBox = taskInfoDisplay.select("div.tox.tox-tinymce");
            rootStyle.style.setProperty('--taskEditorHeight', `${taskTinyAppBox.style("height")}`);
        });
        editor.on("input", e => {
            rootStyle.style.setProperty('--taskEditorHeight', `${taskTinyAppBox.style("height")}`);
        });
    }
});
async function toggleTaskEditing(){
    if(!editingTask){
        editingTask = true;
        taskDisplay.select("em").text("Editing task:");
        // Activate editing functionality
        taskEditButton.select("button").text("Save");
        // Add an event listener for navigating away from page to prevent changes from being lost.
        window.onbeforeunload = function(e){
            return "Changes are unsaved. Would you still like to leave?";
        };
        // Put task info into the text editor, and other data into generic inputs
        tinymce.get("task-info-editor").setContent(taskInfoDisplay.select("#task-info-text").html());
        taskNameInput.property("value", taskNameDisplay.select("h3").text());
        taskCompletionInput.property("value", taskCompletionDisplay.select("div").select("p").text());
        taskButtons.classed("hidden", false);
        // Hide display fields and show input fields, bio editor, and cancel-editing button
        taskDataDisplays.classed("hidden", true);
        // issueImage.classed("shrunk", true);
        taskInputs.classed("hidden", false);
        taskCancelButton.classed("hidden", false);
    }
    // Save changes
    else{
        let infoHTML = tinymce.get("task-info-editor").getContent();
        let taskUpdate = {
            name: taskNameInput.property("value"),
            info: infoHTML,
            completionRequirements: taskCompletionInput.property("value")
        };
        
        // Make an API call to get current user info to be up-to-date, then save the profile, returning and dislaying any error messages
        let response = await fetch(`/task/${activeTask._id}`, {
            method: "PUT",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(taskUpdate)
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
        taskNameDisplay.select("h3").text(taskUpdate.name);
        taskCompletionDisplay.select("div").select("p").text(taskUpdate.completionRequirements);
        d3.select("#task-info-text").html(taskUpdate.info);

        // handle.text(`@ ${topicUpdate.username}`);  // username changes need to be implemented
        
        stopTaskEditing();
    }
}
function stopTaskEditing(){
    // Remove event listener for navigating away from page.
    window.onbeforeunload = () => {};
    taskDisplay.select("em").text("Viewing task:");
    taskEditButton.select("button").text("Edit task");
    editingTask = false;
    // Show display fields and hide input fields
    taskDataDisplays.classed("hidden", false);
    taskInputs.classed("hidden", true);
    taskCancelButton.classed("hidden", true);
}
function displayTaskMessage(message){
    taskMessageSpan.classed("revealed", false);
    taskMessageSpan.text(message);
    void taskMessageSpan.node().offsetWidth;
    taskMessageSpan.classed("revealed", true);
}
