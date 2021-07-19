// TO do:
// Horizontal scrolling (use window.scrollBy(x, y) )
// Elegant issue searching

const baseURL = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port + "/";

const searchForm = document.querySelector("#search form"),
    loggedIn = document.querySelector("#username"),
    issueSearchbar = d3.select("#issue-searchbar"),
    issueToLink = issueSearchbar.select("input"),
    currentIssueID = window.location.pathname.slice(6);

let currentUser, userEdgeVotes, currentIssue,
    connections = d3.select("#connections").selectAll(".connection");

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
        userResultDisplay = resultsArea.select("#user-results");

let searchResults = {},
    issueResultSelection,
    issueResultInfo;
        
function displayResults(){
    if(searchResults.issues){
        issueResultHeader.classed("hidden", false);
    }
    else{
        issueResultHeader.classed("hidden", true);
        searchResults.issues = [];
    }
    if(searchResults.users){
        userResultHeader.classed("hidden", false);
    }
    else{
        userResultHeader.classed("hidden", true);
        searchResults.users = [];
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
    issueResultSelection.exit().remove();
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
    userResultSelection.exit().remove();
    userResultSelection = userResultSelection.merge(userResultsEnter);

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
        fetchString += `&issues=${encodeURIComponent(formInput.get("issues"))}`;
    }
    if(formInput.get("users") === "true"){
        fetchString += `&users=${encodeURIComponent(formInput.get("users"))}`;
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
    connectionSelection;

if(currentIssueID){ loadVotes();}
async function loadVotes(){
    await fetch(`issue/data/${currentIssueID}`)
    .then(res => handleErrors(res))
    .then(res => res.json())
    .then(res => {
        currentIssue = res;
        updateSubissues();
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
        // Get the current user's edgevotes for this issue
        
        let edgeVotes = currentUser.edgeVotes.find(edgeSet => edgeSet.source == currentIssueID);
        if(edgeVotes){
            for(edge of edgeVotes.targets){
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
                    target = currentIssue.issues.edges.find(i => {
                        return String(i.vertex._id) == String(edge.target);
                    });
                scoreSpan.text(target.score);
            }
        }
    }
    
}

// updateSubissues();

function updateSubissues(){
    connectionSelection = d3.select("#connections").selectAll(".connection")
        .data(currentIssue.issues.edges, edge => edge.vertex._id);
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
                .on("click", edge => upvoteLink(currentIssueID, edge.vertex._id));
        connectionVoteEnter
            .append("button")
                .classed("downvote", true)
                .text("Not")
                .on("click", edge => downvoteLink(currentIssueID, edge.vertex._id));
    }
    connectionSelection.exit().remove();
    
    connectionSelection = connectionSelection.merge(connectionEnter);
    d3.select("#connections-are-empty")
        .classed("hidden", !connectionSelection.empty());
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
    issueSearchResults = d3.select("#found-link-issues").selectAll(".result")
        .data(results, issue => issue._id);
    issueSearchResults
        .enter()
        .append("div")
            .classed("result", true)
            .text(issue => issue.name)
            .on("click", issue => upvoteLink(currentIssueID, issue._id));
    issueSearchResults
        .exit()
            .remove();
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
            console.log(err)
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

async function upvoteLink(sourceID, targetID) {
    await fetch(`${baseURL}issue/link/${sourceID}/${targetID}`, {
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
async function downvoteLink(sourceID, targetID){
    await fetch(`${baseURL}issue/link/${sourceID}/${targetID}`, {
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