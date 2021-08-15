// TO do:
// Horizontal scrolling (use window.scrollBy(x, y) )
// Elegant issue searching

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
        projectIdDiv = d3.select("#hidden-project-id"),
        taskIdDiv = d3.select("#hidden-task-id");
let topicID,
    routeBase;

let domRoot = document.documentElement; //root is later declared in nav.js

// Conditional logic to determine page type
if(!issueIdDiv.empty()){ 
    topicID = issueIdDiv.text(); 
    routeBase = "wiki";
}
else if(!projectIdDiv.empty()){
    topicID = projectIdDiv.text(); 
    routeBase = "project";
    domRoot.style.setProperty("--bodyGradient", "linear-gradient(-10deg, rgb(0, 148, 0), rgb(13, 125, 139), rgb(106, 19, 141), rgb(209, 105, 2))");
    domRoot.style.setProperty("--headerLinkColor", "rgb(213 31 98)");
    domRoot.style.setProperty("--linkColor", "rgb(158 231 255)");
    domRoot.style.setProperty("--linkBGColor", "rgb(250 177 133)");
}
else if(!taskIdDiv.empty()){
    topicID = taskIdDiv.text();
    routeBase = "task";
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
        projectResultDisplay = resultsArea.select("#project-results");

let searchResults = {},
    issueResultSelection,
    issueResultInfo,
    userResultSelection,
    userResultInfo,
    projectResultSelection,
    projectResultInfo;
        
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
                .attr("src", user => user.pfpLink || "/assets/magnova_favicon.png");
    userResultsEnter
        .append("a")
        .attr("src", user => user.pfpLink || "/assets/magnova_favicon.png")
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
    
}
function clearSearch(){
    searchResults = {};
    displayResults();
}
function toggleResultInfo(){
    
}
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
    searchResults = await fetch(baseURL + fetchString)
        .then(res => handleErrors(res))
        .then(res => res.json())
        .catch(err => {
            console.log(err)
        });
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
    connectionSelection, projectLinkSelection;

if(topicID){ loadVotes();}
async function loadVotes(){
    let dataRoute = routeBase;
    if(dataRoute === "wiki"){
        dataRoute = "issue";
    }
    await fetch(`${dataRoute}/data/${topicID}`)
    .then(res => handleErrors(res))
    .then(res => res.json())
    .then(res => {
        currentTopicData = res;
        if(currentTopicData.issues){ updateSubissues(); }
        if(currentTopicData.projects){ updateProjects(); }
    })
    .catch(err => {
        console.log(err);
    });
    if(loggedIn){
        if(!currentUser){
            currentUsername = loggedIn.textContent;
        }
        await fetch(`users/unpopulated/${currentUsername}`, {
            method: "GET"
        })
        .then(res => handleErrors(res))
        .then(res => res.json())
        .then(res => currentUser = res)
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
            }, {source: topicID, targets: []} ); // Empty array is the initial value of the accumulator
        }
        if(edgeVotes){
            for(edge of edgeVotes.targets){
                reflectUserIssueVote(edge);
            }
        }
        // Get the current user's votes to projects for this topic
        let projectVotes = {source: topicID, targets: []};
        if(routeBase === "wiki" && currentUser.projectVotes){
            projectVotes = currentUser.projectVotes.find(edgeSet => String(edgeSet.issue) == String(topicID));
        } else if(routeBase === "task"){
            console.log("You still have to implement this, Lavra");
        }
        if(projectVotes){
            for(edge of projectVotes.targets){
                reflectUserProjectVote(edge);
            }
        }
    }
    
}
function reflectUserIssueVote(edge){
    let t = "#issue-" + edge.target;
    let toColor = d3.select(t);
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
                .text("Sub-issue")
                .on("click", edge => upvoteIssueLink(topicID, edge.vertex._id));
        connectionVoteEnter
            .append("button")
                .classed("downvote", true)
                .text("Not")
                .on("click", edge => downvoteIssueLink(topicID, edge.vertex._id));
    }
    connectionSelection.exit().remove();
    
    connectionSelection = connectionSelection.merge(connectionEnter);
    d3.select("#connections-are-empty")
        .classed("hidden", !connectionSelection.empty());
}
function updateProjects(){
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
                .text("Relevant")
                .on("click", edge => upvoteProjectLink(edge.vertex._id, topicID));
        projectVoteEnter
            .append("button")
                .classed("downvote", true)
                .text("Not")
                .on("click", edge => downvoteProjectLink(edge.vertex._id, topicID));
    }
    projectLinkSelection.exit().remove();
    
    projectLinkSelection = projectLinkSelection.merge(projectLinkEnter);
    d3.select("#projects-are-empty")
        .classed("hidden", !projectLinkSelection.empty());
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
            .on("click", issue => upvoteIssueLink(topicID, issue._id));
    
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
    console.log(results);
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
            .on("click", project => upvoteProjectLink(project._id, topicID));
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
    loadVotes();
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
    loadVotes();
}

// Same logic as upvoteLink/downvoteLink but for projects
async function upvoteProjectLink(projectID, nonProjectID) {
    let fetchString = "";
    if(routeBase === "wiki"){
        fetchString = `${baseURL}project/toissue/${projectID}/${nonProjectID}`;
    }
    else if(routeBase === "task"){
        console.log("You still need to implement this, Lavra");
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
    loadVotes();
}
async function downvoteProjectLink(projectID, nonProjectID){
    let fetchString = "";
    if(routeBase === "wiki"){
        fetchString = `${baseURL}project/toissue/${projectID}/${nonProjectID}`;
    }
    else if(routeBase === "project"){
        console.log("You still need to implement this, Lavra");
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
    loadVotes();
}