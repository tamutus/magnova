// TO do:
// Horizontal scrolling (use window.scrollBy(x, y) )
// Elegant issue searching

const baseURL = "http://localhost:3000/"

let connections = d3.select("#connections").selectAll(".connection"),
    loggedIn = document.querySelector("#username"),
    currentIssueID = window.location.pathname.slice(6);

// console.log(connections, votes, upvotes);
let currentUser, edgeVotes;

function handleErrors(res){
    if(!res.ok){
        throw Error(res.status);
    }
    return res;
}

// Place buttons that run the upvote and downvote functions
d3.selectAll(".connection").each(function(){
    let current = d3.select(this);
    let targetID = current.attr("id").slice(6);
    let currentVotes = current.select(".link-votes");
    currentVotes.append("button")
        .classed("upvote", true)
        .on("click", () => upvoteLink(currentIssueID, targetID))
        .text("Sub-issue");
    currentVotes.append("button")
        .classed("downvote", true)
        .on("click", () => downvoteLink(currentIssueID, targetID))
        .text("Unrelated");
});
// let votes = connections.selectAll(".link-vote");
// let voteButtons = votes.append("button")
//     .classed("upvote", true)
//     .on("click", upvoteLink())
// <button class="upvote" onclick="<%= `upvoteLink(${issue._id}, ${link.vertex._id})` %>">Sub-issue</button>
// <button class="downvote" onclick="<%= `downvoteLink(${issue._id}, ${link.vertex._id})` %>"">Unrelated</button>

let upvotes = d3.selectAll(".upvote"),
    downvotes = d3.selectAll(".downvote");

loadVotes();
async function loadVotes(){

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
        }

    }
    
}



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