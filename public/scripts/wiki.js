// TO do:
// Horizontal scrolling (use window.scrollBy(x, y) )
// Elegant logical searching

const baseURL = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port + "/";

const searchForm = document.querySelector("#search form"),
    loggedIn = document.querySelector("#username"),
    issueSearchbar = d3.select("#issue-searchbar"),
    issueToLink = issueSearchbar.select("input"),
    projectSearchbar = d3.select("#project-searchbar"),
    projectToLink = projectSearchbar.select("input");

let currentUser, userEdgeVotes, userProjectVotes, currentTopicData, 
    issueConnections = d3.select("#issue-connections").selectAll(".connection"),
    projectConnections = d3.select("#project-list").selectAll(".project");

// Capture topic id
const   issueIdDiv = d3.select("#hidden-issue-id"),
        localIssueIdDiv = d3.select("#hidden-local-issue-id"),
        projectIdDiv = d3.select("#hidden-project-id"),
        localProjectIdDiv = d3.select("#hidden-local-project-id"),
        taskIdDiv = d3.select("#hidden-task-id"),
        localTaskIdDiv = d3.select("#hidden-local-task-id"),
        locationIdDiv = d3.select("#hidden-location-id");
let topicID,
    routeBase;

const domRoot = document.documentElement; //root is later declared in nav.js

// Conditional logic to determine page type
if(!issueIdDiv.empty()){ 
    topicID = issueIdDiv.text(); 
    routeBase = "wiki";
}
else if(!localIssueIdDiv.empty()){
    topicID = localIssueIdDiv.text();
    routeBase = "wiki/local";
}
else if(!projectIdDiv.empty()){
    topicID = projectIdDiv.text(); 
    routeBase = "project";
    domRoot.style.setProperty("--bodyGradient", "linear-gradient(-10deg, rgb(0, 148, 0), rgb(13, 125, 139), rgb(106, 19, 141), rgb(209, 105, 2))");
    domRoot.style.setProperty("--headerLinkColor", "rgb(206, 255, 255)");
    domRoot.style.setProperty("--linkColor", "rgb(158, 231, 255)");
    domRoot.style.setProperty("--linkBGColor", "rgba(82, 227, 203, .44)");
}
else if(!localProjectIdDiv.empty()){
    topicID = localProjectIdDiv.text();
    routeBase = "project/local";
}
else if(!taskIdDiv.empty()){
    topicID = taskIdDiv.text();
    routeBase = "task";
} 
else if(!localTaskIdDiv.empty()){
    topicID = localTaskIdDiv.text();
    routeBase = "task/local";
} 
else if(!locationIdDiv.empty()){
    topicID = locationIdDiv.text();
    routeBase = "locations";
}

function handleErrors(res){
    if(!res.ok){
        throw Error(res.status);
    }
    return res;
}

// Search functionality
const   resultsArea = d3.select("#search-results"),
        issueResultHeader = resultsArea.select("#issue-results-header"),
        issueResultDisplay = resultsArea.select("#issue-results"),
        userResultHeader = resultsArea.select("#user-results-header"),
        userResultDisplay = resultsArea.select("#user-results"),
        projectResultHeader = resultsArea.select("#project-results-header"),
        projectResultDisplay = resultsArea.select("#project-results"),
        locationResultHeader = resultsArea.select("#location-results-header"),
        locationResultDisplay = resultsArea.select("#location-results");

let searchResults = {},
    issueResultSelection,
    issueResultInfo,
    userResultSelection,
    userResultInfo,
    projectResultSelection,
    projectResultInfo,
    locationResultSelection,
    locationResultInfo;
        
function displayResults(){
    if(searchResults.issues && searchResults.issues.length > 0){
        issueResultHeader.classed("hidden", false);
        issueResultDisplay.classed("hidden", false);
    }
    else{
        issueResultHeader.classed("hidden", true);
        issueResultDisplay.classed("hidden", true);
        searchResults.issues = [];
    }
    if(searchResults.users && searchResults.users.length > 0){
        userResultHeader.classed("hidden", false);
    }
    else{
        userResultHeader.classed("hidden", true);
        searchResults.users = [];
    }
    if(searchResults.projects && searchResults.projects.length > 0){
        projectResultHeader.classed("hidden", false);
    }
    else{
        projectResultHeader.classed("hidden", true);
        searchResults.projects = [];
    }
    if(searchResults.locations && searchResults.locations.length > 0){
        locationResultHeader.classed("hidden", false);
    }
    else{
        locationResultHeader.classed("hidden", true);
        searchResults.locations = [];
    }

    // Display issue results
    issueResultSelection = issueResultDisplay.selectAll(".search-result")
        .data(searchResults.issues, d => d._id);
    let issueResultsEnter = issueResultSelection
        .enter()
        .append("div")
            .classed("search-result", true);
    issueResultsEnter
        .append("a")
        .attr("href", issue => `${baseURL}wiki/${issue._id}`)
        .classed("result-thumbnail-link", true)
            .append("img")
                .classed("result-thumbnail", true)
                .attr("src", issue => issue.image || "/assets/magnova_favicon.png");
    issueResultsEnter
        .append("a")
        .attr("href", issue => `${baseURL}wiki/${issue._id}`)
        .classed("result-name-link", true)
            .append("h4")
                .classed("result-name", true)
                .text(issue => {
                    if(issue?.name.length > 50){
                        return `${issue.name.slice(0, 46)}...` 
                    }
                    else{ return issue.name; }
                });
    issueResultsEnter
        .append("p")
            .classed("issue-info", true)
            .text(issue => {
                let formattedInfo = issue?.info || "";
                formattedInfo = formattedInfo.replace( /(<([^>]+)>)/ig, '');
                if(formattedInfo.length > 100){
                    return `${formattedInfo.slice(0, 96)}...` 
                }
                else{ return formattedInfo; }
            });
    issueResultSelection.exit()
        .classed("leaving", true)
        .transition(0)
        .delay(500)
        .remove();
    issueResultSelection = issueResultSelection.merge(issueResultsEnter);
    
    // Display user results
    userResultSelection = userResultDisplay.selectAll(".search-result")
        .data(searchResults.users, d => d._id);
    let userResultsEnter = userResultSelection
        .enter()
        .append("div")
            .classed("search-result", true);
    userResultsEnter
        .append("a")
        .attr("href", user => `${baseURL}users/${user.username}`)
        .classed("result-thumbnail-link", true)
            .append("img")
                .classed("result-thumbnail", true)
                .attr("src", user => user.pfpLink || "/assets/default_avatar.png");
    userResultsEnter
        .append("a")
        .attr("href", user => `${baseURL}users/${user.username}`)
        .classed("result-name-link", true)
            .append("h4")
                .classed("result-name", true)
                .text(user => {
                    if(user?.username.length > 50){
                        return `${user.username.slice(0, 46)}...` 
                    }
                    else{ return user.username; }
                });
    userResultsEnter
        .append("p")
            .classed("user-bio", true)
            .text(user => {
                let formattedBio = user?.bio || "";
                formattedBio = formattedBio.replace( /(<([^>]+)>)/ig, '');
                if(formattedBio.length > 100){
                    return `${formattedBio.slice(0, 96)}...` 
                }
                else{ return formattedBio; }
            });
    userResultSelection.exit()
        .classed("leaving", true)
        .transition(0)
        .delay(500)
        .remove();
    userResultSelection = userResultSelection.merge(userResultsEnter);
    
    // Display project results
    projectResultSelection = projectResultDisplay.selectAll(".search-result")
        .data(searchResults.projects, d => d._id);
    let projectResultsEnter = projectResultSelection
        .enter()
        .append("div")
            .classed("search-result", true);
    projectResultsEnter
        .append("a")
        .attr("href", project => `${baseURL}project/${project._id}`)
        .classed("result-thumbnail-link", true)
            .append("img")
                .classed("result-thumbnail", true)
                // .attr("src", project => project.image || "/assets/BLM.svg");
                .attr("src", project => "/assets/BLM.svg");
    projectResultsEnter
        .append("a")
        .attr("href", project => `${baseURL}project/${project._id}`)
        .classed("result-name-link", true)
            .append("h4")
                .classed("result-name", true)
                .text(project => {
                    if(project?.name.length > 50){
                        return `${project.name.slice(0, 46)}...` 
                    }
                    else{ return project.name; }
                });
    projectResultsEnter
        .append("p")
            .classed("project-info", true)
            .text(project => {
                let formattedInfo = project?.info || "";
                formattedInfo = formattedInfo.replace( /(<([^>]+)>)/ig, '');
                if(formattedInfo.length > 100){
                    return `${formattedInfo.slice(0, 96)}...` 
                }
                else{ return formattedInfo; }
            });
    projectResultSelection.exit()
        .classed("leaving", true)
        .transition(0)
        .delay(500)
        .remove();
    projectResultSelection = projectResultSelection.merge(projectResultsEnter);
    
    // Display Location results
    locationResultSelection = locationResultDisplay.selectAll(".search-result")
        .data(searchResults.locations, d => d._id);
    let locationResultsEnter = locationResultSelection
        .enter()
        .append("div")
            .classed("search-result", true);
    locationResultsEnter
        .append("a")
        .attr("href", location => `${baseURL}locations/${location._id}`)
        .classed("result-thumbnail-link", true)
            .append("img")
                .classed("result-thumbnail", true)                
                .attr("src", "https://cdn.pixabay.com/photo/2014/04/02/17/08/globe-308065_960_720.png");
    locationResultsEnter
        .append("a")
        .attr("href", location => `${baseURL}locations/${location._id}`)
        .classed("result-name-link", true)
            .append("h4")
                .classed("result-name", true)
                .text(location => {
                    // copy minimap code to add superlocation name
                    let childAndParent = "";
                    if(location?.name.length > 50){
                        childAndParent += `${location.name.slice(0, 46)}...` ;
                    }
                    else{ childAndParent += location.name; }
                    if(location?.superlocation?.name){
                        childAndParent += " of ";
                        if(location.superlocation.name > 50 ){
                            childAndParent += `${location.superlocation.name.slice(0, 46)}...`;
                        } else { childAndParent += location.superlocation.name; }
                    }
                    return childAndParent;
                });
    locationResultsEnter
        .append("p")
            .classed("location-info", true)
            .text(location => {
                let formattedInfo = location?.info || "";
                formattedInfo = formattedInfo.replace( /(<([^>]+)>)/ig, '');
                if(formattedInfo.length > 100){
                    return `${formattedInfo.slice(0, 96)}...` 
                }
                else{ return formattedInfo; }
            });
    locationResultSelection.exit()
        .classed("leaving", true)
        .transition(0)
        .delay(500)
        .remove();
    locationResultSelection = locationResultSelection.merge(locationResultsEnter);
    
    document.querySelector('#search-results').scrollIntoView({behavior: 'smooth'})
}
function clearSearch(){
    searchResults = {};
    displayResults();
}

function toggleResultInfo(){
    
}

// Attach search to the DOM and prevent the submit button from redirecting.
if(searchForm){
    searchForm.addEventListener("submit", e => {
        e.preventDefault();
        searchAll();
    });
}
async function searchAll(){
    let formInput = new FormData(searchForm);
    let fetchString = `wiki/search?target=${encodeURIComponent(formInput.get("target"))}`;
    if(formInput.get("issues") === "true"){
        fetchString += `&issues=true`;
    }
    if(formInput.get("users") === "true"){
        fetchString += `&users=true`;
    }
    if(formInput.get("projects") === "true"){
        fetchString += `&projects=true`;
    }
    if(formInput.get("locations") === "true"){
        fetchString += `&locations=true`;
    }
    // console.log(`Sending fetch request ${baseURL + fetchString}`);
    searchResults = await fetch(baseURL + fetchString)
        .then(res => handleErrors(res))
        .then(res => res.json())
        .catch(err => {
            console.log(err)
        });
    // console.log(searchResults.locations);
    displayResults();
}
// // Place buttons that run the upvote and downvote functions
// d3.selectAll(".connection").each(function(){
//     let current = d3.select(this);
//     let targetID = current.attr("id").slice(6);
//     let currentVotes = current.select(".link-votes");
//     currentVotes.append("button")
//         .classed("upvote", true)
//         .on("click", () => upvoteLink(currentIssueID, targetID))
//         .text("Sub-issue");
//     currentVotes.append("button")
//         .classed("downvote", true)
//         .on("click", () => downvoteLink(currentIssueID, targetID))
//         .text("Unrelated");
// });


// let votes = connections.selectAll(".link-vote");
// let voteButtons = votes.append("button")
//     .classed("upvote", true)
//     .on("click", upvoteLink())
// <button class="upvote" onclick="<%= `upvoteLink(${issue._id}, ${link.vertex._id})` %>">Sub-issue</button>
// <button class="downvote" onclick="<%= `downvoteLink(${issue._id}, ${link.vertex._id})` %>"">Unrelated</button>

let upvotes = d3.selectAll(".upvote"),
    downvotes = d3.selectAll(".downvote"),
    connectionSelection, projectLinkSelection, instanceSelection, implementationSelection;

if(topicID){ loadData();}

async function loadData(){
    // Only load votes on wiki pages for issue templates and project templates
    const allowedRoutes = ["project", "wiki", "locations", "wiki/local", "project/local"];
    if(!allowedRoutes.includes(routeBase)){
        return;
    }
    
    let dataRoute = routeBase;
    if(dataRoute === "wiki"){
        dataRoute = "issue";
    }
    if(dataRoute === "wiki/local"){
        dataRoute = "issue/local";
    }
    currentTopicData = await fetch(`${dataRoute}/data/${topicID}`)
        .then(res => handleErrors(res))
        .then(res => res.json())
        .then(res => {
            if(res?.message === "OK"){
                return res.content;
            } else {
                return res;
            }
        })
        .catch(err => {
            console.log(err);
        });
    if(currentTopicData.issues){ updateSubissues(); }
    if(currentTopicData.projects){ updateProjects(); }
    if(currentTopicData.instances) { updateInstances(); }
    if(currentTopicData.implementations) { updateImplementations(); }
    
    // Here is where votes are updated. Only necessary for projects and issues.
    if(loggedIn && (routeBase === "project" || routeBase === "wiki")){
        if(!currentUser){
            currentUsername = loggedIn.textContent;
        }
        currentUser = await fetch(`users/unpopulated/${currentUsername}`, {
            method: "GET"
        })
            .then(res => handleErrors(res))
            .then(res => res.json())
            // .then(res => currentUser = res)
            .catch(err => {
                console.log(err);
            });
        // Get the current user's votes to issues for this topic
        let edgeVotes = {source: topicID, targets: []};
        if(routeBase === "wiki"){
            edgeVotes = currentUser.edgeVotes.find(edgeSet => String(edgeSet.source) == String(topicID));
        } else if(routeBase === "project"){
            // Since issue-project links are stored in user model as an array of issues linking to arrays of projects, 
            // here it reduces to a new object linking a project to an array of issues.
            edgeVotes = currentUser.projectVotes.reduce((acc, edgeSet) => {
                let edge = edgeSet.targets.find(e => {
                    return String(e.project) == String(topicID)
                })
                if(edge){
                    acc.targets.push({
                        target: edgeSet.issue,
                        vote: edge.vote
                    });
                }
                return acc;
            }, {source: topicID, targets: []} ); // Object with empty array is the initial value of the accumulator
        }
        if(edgeVotes){
            for(edge of edgeVotes.targets){
                reflectUserIssueVote(edge);
            }
        }
        // Get the current user's votes to projects for this topic
        if(routeBase === "wiki" && currentUser.projectVotes){
            let projectVotes = currentUser.projectVotes.find(edgeSet => String(edgeSet.issue) === String(topicID));
            if(projectVotes){
                for(edge of projectVotes.targets){
                    reflectUserProjectVote(edge);
                }
            }
        }
    }
    
}
function reflectUserIssueVote(edge){
    let t = "#issue-" + edge.target;
    let toColor = d3.select(t);
    if(toColor.empty()){
        console.log("Couldn't find the issue for which you voted on a connection");
        return;
    }
    let upvote = toColor.select(".link-votes").select(".upvote"),
        downvote = toColor.select(".link-votes").select(".downvote");
    if(edge.vote){
        upvote.classed("up", true);
        downvote.classed("down", false);
    } else {
        upvote.classed("up", false);
        downvote.classed("down", true);
    }
    let scoreSpan = toColor.select(".link-info").select(".link-score"),
        target = currentTopicData.issues.edges.find(i => {
            return String(i.vertex._id) == String(edge.target);
        });
    scoreSpan.text(target.score);
}
function reflectUserProjectVote(edge){
    let p = "#project-" + edge.project;
    let toColor = d3.select(p);
    if(toColor.empty()){
        console.log("Couldn't find the issue for which you voted on a connection");
        return;
    }
    let upvote = toColor.select(".project-votes").select(".upvote"),
        downvote = toColor.select(".project-votes").select(".downvote");
    if(edge.vote){
        upvote.classed("up", true);
        downvote.classed("down", false);
    } else {
        upvote.classed("up", false);
        downvote.classed("down", true);
    }
    let scoreSpan = toColor.select(".project-info").select(".project-score"),
        target = currentTopicData.projects.edges.find(i => {
            return String(i.vertex._id) == String(edge.project);
        });
    scoreSpan.text(target.score);
}

// updateSubissues();

function updateSubissues(){
    if(routeBase === "wiki" || routeBase === "project"){
        connectionSelection = d3.select("#issue-connections").selectAll(".connection")
           .data(currentTopicData.issues.edges, edge => edge.vertex._id);
        let connectionEnter = connectionSelection
           .enter()
               .append("div")
                   .classed("connection", true)
                   .attr("id", edge => `issue-${edge.vertex._id}`);
       connectionEnter
           .append("div")
               .classed("link-info", true)
               .html(edge => `<a href="wiki/${edge.vertex._id}">${edge.vertex.name}</a>: <span class="link-score">${edge.score}</span>`);
       let connectionVoteEnter = connectionEnter
           .append("div")
               .classed("link-votes", true);
       if(loggedIn){
           connectionVoteEnter
               .append("button")
                   .classed("upvote", true)
                   .text(d => {
                       if(routeBase === "wiki"){return "Sub-issue"}
                       if(routeBase === "project"){return "Helps"}
                   })
                   .on("click", edge => upvoteIssueLink(topicID, edge.vertex._id));
           connectionVoteEnter
               .append("button")
                   .classed("downvote", true)
                   .text(d => {
                        if(routeBase === "wiki"){return "Not"}
                        if(routeBase === "project"){return "Misses"}
                    })
                   .on("click", edge => downvoteIssueLink(topicID, edge.vertex._id));
       }
       connectionSelection.exit().remove();
       connectionSelection = connectionSelection.merge(connectionEnter);
    }
    // Locations don't track votes to local issues, so they can be displayed differently.
    else if(routeBase === "locations"){
        connectionSelection = d3.select("#local-issue-list").selectAll(".local-issue-snapshot")
           .data(currentTopicData.issues, localIssue => localIssue._id);
        let connectionEnter = connectionSelection
           .enter()
               .append("div")
                   .classed("local-issue-snapshot", true)
                   .attr("title", localIssue => localIssue.template.name)
                   .attr("id", localIssue => `local-issue-${localIssue._id}`)
                   .html(localIssue => {
                        let formattedInfo;
                        if(localIssue.localInfo){
                            formattedInfo = localIssue.localInfo.replace( /(<([^>]+)>)/ig, '');
                            if(formattedInfo.length > 100){
                                formattedInfo = `${formattedInfo.slice(0, 96)}...` 
                            }
                        } else {
                            formattedInfo = "<em>No local information yet. Why not add some?</em>";
                        }
                        return `<a href="wiki/local/${localIssue._id}">
                        <div class="tiny issue-thumbnail"><img src="${localIssue.image}"></div>
                        <h4>
                        ${localIssue.template.name.length <= 30 ? localIssue.template.name : localIssue.template.name.slice(0, 26) + "..."}
                        </h4>
                        </a>
                        <div class="info">${formattedInfo}</div>`
                    });
                       
       connectionSelection.exit().remove();
       
       connectionSelection = connectionSelection.merge(connectionEnter);
    } else { 
        return; 
    }
    
    d3.select("#connections-are-empty")
        .classed("hidden", !connectionSelection.empty());
}
function updateProjects(){
    if(routeBase === "wiki" || routeBase === "project"){
        projectLinkSelection = d3.select("#project-list").selectAll(".connection")
            .data(currentTopicData.projects.edges, edge => edge.vertex._id);
        let projectLinkEnter = projectLinkSelection
            .enter()
                .append("div")
                    .classed("connection", true)
                    .attr("id", edge => `project-${edge.vertex._id}`);
        projectLinkEnter
            .append("div")
                .classed("project-info", true)
                .html(edge => `<a href="project/${edge.vertex._id}">${edge.vertex.name}</a>: <span class="project-score">${edge.score}</span>`);
        let projectVoteEnter = projectLinkEnter
            .append("div")
                .classed("project-votes", true);
        if(loggedIn){
            projectVoteEnter
                .append("button")
                    .classed("upvote", true)
                    .text("Helpful")
                    .on("click", edge => upvoteProjectLink(edge.vertex._id, topicID));
            projectVoteEnter
                .append("button")
                    .classed("downvote", true)
                    .text("Misses")
                    .on("click", edge => downvoteProjectLink(edge.vertex._id, topicID));
        }
        projectLinkSelection.exit().remove();
        projectLinkSelection = projectLinkSelection.merge(projectLinkEnter);
    // Locations are a little different, since they don't store projectGraphs, they just store an array of local projects
    } else if(routeBase === "locations"){
        projectLinkSelection = d3.select("#local-project-list").selectAll(".connection")
           .data(currentTopicData.projects, localProject => localProject._id);
        let projectLinkEnter = projectLinkSelection
           .enter()
               .append("div")
                   .classed("connection", true)
                   .attr("id", localProject => `local-project-${localProject._id}`);
       projectLinkEnter
           .append("div")
               .classed("project-info", true)
               .html(localProject => `<a href="project/local/${localProject._id}">${localProject.name}</a>`);
       
       projectLinkSelection.exit().remove();
       
       projectLinkSelection = projectLinkSelection.merge(projectLinkEnter);
    } else {
        return;
    }

   
    d3.select("#projects-are-empty")
        .classed("hidden", !projectLinkSelection.empty());
}
// Call this for issues, which will have local issue instances

function updateInstances(){
    instanceSelection = d3.select("#local-issue-list").selectAll(".local-issue-snapshot")
        .data(currentTopicData.instances, localIssue => localIssue._id);
    let connectionEnter = instanceSelection
        .enter()
            .append("div")
                .classed("local-issue-snapshot", true)
                .attr("title", localIssue => localIssue.location.name)
                .attr("id", localIssue => `local-issue-${localIssue._id}`)
                .html(localIssue => {
                    let formattedInfo;
                    if(localIssue.localInfo){
                        formattedInfo = localIssue.localInfo.replace( /(<([^>]+)>)/ig, '');
                        if(formattedInfo.length > 100){
                            formattedInfo = `${formattedInfo.slice(0, 96)}...` 
                        }
                    } else {
                        formattedInfo = "<em>No local information yet. Why not add some?</em>";
                    }
                    return `<a href="wiki/local/${localIssue._id}">
                        <div class="tiny issue-thumbnail"><img src="${localIssue.image}"></div>
                        <h4>
                            ${localIssue.location.name.length <= 30 ? localIssue.location.name : localIssue.location.name.slice(0, 26) + "..."}
                        </h4>
                    </a>
                    <div class="info">${formattedInfo}</div>`
                });
    
    instanceSelection.exit().remove();
    
    instanceSelection = instanceSelection.merge(connectionEnter);

    d3.select("#instances-are-empty")
        .classed("hidden", !instanceSelection.empty());
}
function updateImplementations(){
    implementationSelection = d3.select("#implementation-list").selectAll(".local-project-snapshot")
        .data(currentTopicData.implementations, localProject => localProject._id);
    let implementationEnter = implementationSelection
        .enter()
            .append("div")
                .classed("local-project-snapshot", true)
                .attr("title", localProject => localProject.location.name)
                .attr("id", localProject => `local-project-${localProject._id}`)
                .html(localProject => {
                    let formattedInfo;
                    if(localProject.localInfo){
                        formattedInfo = localProject.localInfo.replace( /(<([^>]+)>)/ig, '');
                        if(formattedInfo.length > 100){
                            formattedInfo = `${formattedInfo.slice(0, 96)}...` 
                        }
                    } else {
                        formattedInfo = "<em>No local information yet. Why not add some?</em>";
                    }
                    return `<a href="project/local/${localProject._id}">
                        <div class="tiny project-thumbnail"><img src="${localProject.image}"></div>
                        <h4>
                            ${localProject.location.name.length <= 30 ? localProject.location.name : localProject.location.name.slice(0, 26) + "..."}
                        </h4>
                    </a>
                    <div class="info">${localProject.localInfo ? localProject.localInfo.slice(0, 200) + "..." : "<em>No local information yet. Why not add some?</em>"}</div>`
                });
    
    implementationSelection.exit().remove();
    
    implementationSelection = implementationSelection.merge(implementationEnter);

    d3.select("#projects-are-empty")
        .classed("hidden", !implementationSelection.empty());
}
// let issues = [];
// getIssues();
// function getIssues(){
//     fetch(baseURL + "issue/all")
//         .then(res => handleErrors(res))
//         .then(res => res.json())
//         .then(res => issues = res)
//         .catch(err => {
//             console.log(err)
//         });
// }
    

// Issue linker stuff

issueToLink.on("change", issueLinkSearch);
projectToLink.on("change", projectLinkSearch);
// const linksearchInput = document.querySelector("#issue-searchbar input");
// if(linksearchInput){
//     linksearchInput.addEventListener("keyup", event => {
//         if(event.code === "Enter"){
//             issueLinkSearch();
//         }
//     });
// }

let issueSearchResults;

async function issueLinkSearch(){
    let input = String(issueToLink.property("value"));
    let results = await issueSearch(input);
    if(results === "Blocked") {
        return;
    }
    issueSearchResults = d3.select("#found-issue-links").selectAll(".result")
        .data(results, issue => issue._id);
    issueSearchResults.sort((a, b) => d3.descending(a.confidenceScore, b.confidenceScore));
    issueSearchResults
        .exit()
            .remove();
    issueSearchResults
        .enter()
        .append("div")
            .classed("result", true)
            .text(issue => issue.name)
            .on("click", issue => routeBase === "locations" ? identifyLocalIssue(topicID, issue._id) : upvoteIssueLink(topicID, issue._id));
    
}

let pendingSearch = "";
async function issueSearch(input){
    if(input){
        let fetchString = `wiki/search?target=${encodeURIComponent(input)}&issues=true`;
        if(pendingSearch !== ""){
            pendingSearch = fetchString.slice(0);
            return "Blocked";
        }
        pendingSearch = fetchString.slice(0);
        let results = await issueFetch(fetchString);
        return results;
    }
    else return [];
}
async function issueFetch(fetchString){
    let results = await fetch(baseURL + fetchString)
        .then(res => handleErrors(res))
        .then(res => res.json())
        .then(res => { 
                // If at least one other search was run after your initial call, you should run a new search with the latest one.
                if(pendingSearch !== fetchString){
                    return issueFetch(pendingSearch);
                } else {
                    pendingSearch = "";
                    return res.issues;
                }
            })
        .catch(err => {
            console.log(err);
        });
    return results;
}

let projectSearchResults;

async function projectLinkSearch(){
    let input = String(projectToLink.property("value"));
    let results = await projectSearch(input);
    if(results === "Blocked") {
        return;
    }
    projectSearchResults = d3.select("#found-project-links").selectAll(".result")
        .data(results, project => project._id);
    projectSearchResults.sort((a, b) => d3.descending(a.confidenceScore, b.confidenceScore));
    projectSearchResults
        .enter()
        .append("div")
            .classed("result", true)
            .text(project => project.name)
            .on("click", project => routeBase === "locations" ? deployLocalProject(topicID, project._id) : upvoteProjectLink(project._id, topicID));
    projectSearchResults
        .exit()
            .remove();
}

let pendingProjectSearch = "";
async function projectSearch(input){
    if(input){
        let fetchString = `wiki/search?target=${encodeURIComponent(input)}&projects=true`;
        if(pendingProjectSearch !== ""){
            pendingProjectSearch = fetchString.slice(0);
            return "Blocked";
        }
        pendingProjectSearch = fetchString.slice(0);
        let results = await projectFetch(fetchString);
        return results;
    }
    else return [];
}
async function projectFetch(fetchString){
    let results = await fetch(baseURL + fetchString)
        .then(res => handleErrors(res))
        .then(res => res.json())
        .then(res => {
            // If at least one other search was run after your initial call, you should run a new search with the latest one.
            if(pendingProjectSearch !== fetchString){
                return projectFetch(pendingProjectSearch);
            } else {
                pendingProjectSearch = "";
                return res.projects;
            }
        })
        .catch(err => {
            console.log(err);
        });
    return results;
}
// async function issueSearch(input){
//     if(input){
//         let fetchString = `wiki/search?target=${encodeURIComponent(input)}&issues=true`;
//         if(pendingSearch !== ""){
//             pendingSearch = fetchString.slice(0);
//             return "Blocked";
//         }
//         pendingSearch = fetchString.slice(0);
//         let results = [];
//         await fetch(baseURL + fetchString)
//             .then(res => handleErrors(res))
//             .then(res => res.json())
//             .then(res => {
//                 // If at least one other search was run after your initial call, you should run a new search with the latest one.
//                 if(pendingSearch !== fetchString){
//                     unblockSearch();
//                 } else{
//                     pendingSearch = "";
//                 }
//                 results = res.issues;
//                 return results;
//             })
//             .catch(err => {
//                 console.log(err)
//             });
//         return results.filter(issue => {
//             return (String(issue._id) != String(currentIssueID));
//         });
//     }
//     else return [];
// }

// async function unblockSearch(){
//     pendingSearch = "";
//     issueLinkSearch();
// }

function toggleIssueSearchbar(){
    issueSearchbar.classed("hidden", !issueSearchbar.classed("hidden"));
}

// document.querySelector("#issue-searchbar input").focus();

// General functions

async function identifyLocalIssue(locationID, issueID){
    if(!locationID.match(/^[0-9a-fA-F]{24}$/) || !issueID.match(/^[0-9a-fA-F]{24}$/)){
        console.error("Tried identifying a Local Issue with an improper Issue or Location id.");
        return;
    }
    let result = await fetch(`/issue/localize/${issueID}/${locationID}`,{
        method: "POST"
    })
        .then(handleErrors)
        .then(res => res.json()) // *TO DO: Check whether you can detect whether .json or .text is appropriate
        .catch(console.error);
    if(result.message === "exists"){
        // display this message. Run a countdown?
        console.log("A local issue here already exists.");
        if(result.localURL){
            console.log("Redirecting in three seconds");
            setTimeout(() => {
                window.location = result.localURL;
            }, 3000);
        }
    }
    else if(result.message === "success" && result.localURL){
        window.location = result.localURL;
    }
    else if(result.message){
        console.log(result.message);
    } else {
        console.log(result);
    }
}

async function upvoteIssueLink(sourceID, targetID) {
    if(String(sourceID) === String(targetID)){
        return;
    }
    let fetchString = "";
    if(routeBase === "wiki"){
        fetchString = `${baseURL}issue/link/${sourceID}/${targetID}`;
    }
    else if(routeBase === "project"){
        fetchString = `${baseURL}project/toissue/${sourceID}/${targetID}`;
    }

    await fetch(fetchString, {
        method: "PUT"
    })
    .then(res => handleErrors(res))
    .then(res => res.text())
    .then(res => console.log(res))
    .catch(err => {
        return console.log(err);
    });
    loadData();
}
async function downvoteIssueLink(sourceID, targetID){
    let fetchString = "";
    if(routeBase === "wiki"){
        fetchString = `${baseURL}issue/link/${sourceID}/${targetID}`;
    }
    else if(routeBase === "project"){
        fetchString = `${baseURL}project/toissue/${sourceID}/${targetID}`;
    }
    await fetch(fetchString, {
        method: "DELETE"
    })
    .then(res => handleErrors(res))
    .then(res => res.text())
    .then(res => console.log(res))
    .catch(err => {
        return console.log(err);
    });
    loadData();
}

// Same logic as identifyLocalIssue but for projects
async function deployLocalProject(locationID, projectID){
    console.log(locationID, projectID);
}

// Same logic as upvoteLink/downvoteLink but for projects
async function upvoteProjectLink(projectID, nonProjectID) {
    let fetchString = "";
    if(routeBase === "wiki"){
        fetchString = `${baseURL}project/toissue/${projectID}/${nonProjectID}`;
    }
    // else if(routeBase === "task"){
    //     console.log("You still need to implement this, Lavra");
    // }

    await fetch(fetchString, {
        method: "PUT"
    })
    .then(res => handleErrors(res))
    .then(res => res.text())
    .then(res => console.log(res))
    .catch(err => {
        return console.log(err);
    });
    loadData();
}
async function downvoteProjectLink(projectID, nonProjectID){
    let fetchString = "";
    if(routeBase === "wiki"){
        fetchString = `${baseURL}project/toissue/${projectID}/${nonProjectID}`;
    } else {
        return;
    }
    await fetch(fetchString, {
        method: "DELETE"
    })
    .then(res => handleErrors(res))
    .then(res => res.text())
    .then(res => console.log(res))
    .catch(err => {
        return console.log(err);
    });
    loadData();
}