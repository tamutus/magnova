// To do:   Spectra to measure
//          Instead of getting all issues and working from that, do individual searches that are handled in backend and give smaller datasets
//          Add in a way to hide links, and a way to downvote them. A box that pops up on hover?
//          Scale node text to fit inside the circles


  //===========================//
 // Establish base parameters //
//===========================//

const baseURL = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port + "/";

// Fetch all issues                 //* This will need to be refactored, obviously, to do specific searches on a fetch performed during 
let nodes = [],
    issues = [],
    loggedIn = document.querySelector("#username"),
    currentUser,
    userEdgevotes = [];

fetch(baseURL + "issue/all")
    .then(res => handleErrors(res))
    .then(res => res.json())
    .then(res => issues = res)
    .catch(err => {
        console.log(err)
    });
let links = [];

// Load graph from cookies

//     { source: "Climate Change", target: "Poverty"}

// Set node and arrow size
let nodeSize = 50,
    nodeFontSize = 20,
    arrowSize = 20;

let backupNodes = [
    { name: "red", color: "red", size: 50},
    { name: "red", color: "orange", size: 20},
    { name: "red", color: "yellow", size: 25},
    { name: "red", color: "green", size: 30},
    { name: "red", color: "blue", size: 35},
    { name: "red", color: "purple", size: 40}
];

// Keeps track of which node has been clicked, for which the tool wheel shall open
let activeNode = null;   
// Keeps track of which link was most recently clicked, so its center can be tracked and the link buttons can be moved. Both of theses things happen in the tick function.
let activeLink = null,
    activeLinkCoords = {x: 0, y: 0};



// Links between nodes, using color as id (defined later, in nodeSelection build calls)
let backupLinks = [
    { source: "red", target: "orange"},
    { source: "orange", target: "yellow"},
    { source: "yellow", target: "green"},
    { source: "green", target: "blue"},
    { source: "blue", target: "purple"},
    { source: "purple", target: "red"},
    { source: "green", target: "red"}
];


  //==============//
 // DOM Captures //
//==============//

const svg = d3.select("#force-graph"),
    nodeArea = svg.select("#nodes"),
    toolwheel = svg.select("#tools"),
    linkButtons = svg.select("#link-buttons"),
    linkUpvoter = svg.select("#link-upvote"),
    linkDownvoter = svg.select("#link-downvote"),
    issueSearchbar = d3.select("#issue-searchbar"),
    issueToLink = issueSearchbar.select("input"),
    loadButton = d3.select("#fg-utilities").select("#load-button"),
    clearButton = d3.select("#fg-utilities").select("#clear-button"),
    createButton = d3.select("#fg-utilities").select("#create-button"),
    issueLoader = d3.select("#issue-loader"),
    issueLoaderPrompt = issueLoader.select("#issue-loader-prompt"),
    issueToLoad = issueLoader.select("#issue-to-load"),
    loadedIssues = issueLoader.select("#loaded-issues");

  //================================//
 // Attach functions to DOM events //
//================================//

loadButton.on("click", () => {
    issueLoader.classed("hidden", !issueLoader.classed("hidden"));
    loadButton.classed("pressed", !loadButton.classed("pressed"));
});
clearButton.on("click", () => {
    issueSearchbar.classed("hidden", true);
    linkButtons.classed("hidden", true);
    toolwheel.classed("hidden", true);
    activeNode = null;
    activeLink = null;
    nodes = [];
    links = [];
    updateLinks();
    updateNodes();
    saveLinksToCookie();
    saveNodesToCookie();
})
createButton.on("click", () => {

});
issueToLink.on("input", issueLinkSearch);
document.querySelector("#issue-searchbar input").addEventListener("keyup", event => {
    if(event.code === "Enter"){
        tryLink();
    }
});
issueToLoad.on("input", issueLoadSearch);
document.querySelector("#issue-to-load").addEventListener("keyup", event => {
    if(event.code === "Enter"){
        if(loadedIssues.selectAll(".result").length !== 0)
            tryLoad(loadedIssues.select(".result").datum()._id);
    }
});

  //==============================//
 // Node and link handling logic //
//==============================//

// SVG elements have no z-index, so links are drawn first to appear behind the nodes, and tools are drawn last. 
let linkSelection, linkBoxes, linkPaths, linkArrows;

updateLinks();
function updateLinks(){
    updateLinkSelections();
    let linkEnter = linkSelection
        .enter()
        .append("g")
            .classed("link", true)
            .on("click", d => toggleLinkTools(d));
    linkEnter
        .append("line")
            .classed("link-box", true)
            // .attr("stroke", "url(#constellation-gradient)");
    linkEnter
        .append("line")
            .classed("link-path", true);
    linkEnter
        .append("polyline")
            .classed("link-arrow", true);
    linkSelection
        .exit()
        .remove();
    updateLinkSelections();
}

function updateLinkSelections(){
    linkSelection = d3.select("#links").selectAll(".link") 
        .data(links, d => `${d.source._id}*${d.target._id}`);                                               // ** Need to code identifiers for links
    linkBoxes = linkSelection.selectAll(".link-box");
    linkPaths = linkSelection.selectAll(".link-path");
    linkArrows = linkSelection.selectAll(".link-arrow");
}

let nodeGroupSelection, nodeSelection, nodeTextSelection;

updateNodes();

function updateNodes(){
    updateNodeSelections();
    let nodeGroupEnter = nodeGroupSelection
        .enter()
        .append("g")
            .classed("node-group", true);
    nodeGroupEnter
        .append("circle")
            .classed("node", true)
            // .style("fill", d => colorNode(d))
            .call(d3.drag()
                .on("start", dragStart)
                .on("drag", drag)
                .on("end", dragEnd))
            .on("click", toggleTools);
    let nodeTextEnter = nodeGroupEnter
        .append("foreignObject")
            .attr("pointer-events", "none");

    nodeTextEnter
        .append("xhtml:div")    // https://stackoverflow.com/questions/13848039/svg-foreignobject-contents-do-not-display-unless-plain-text
            .classed("node-text", true)
            .attr("xmlns", "http://www.w3.org/1999/xhtml")
            .append("div")
                .text(d => d.name)
                .attr("pointer-events", "none");
    
    nodeGroupSelection
        .exit()
            .remove();
    updateNodeSelections();
    nodeSelection
        .attr("r", nodeSize);
    nodeTextSelection
        .attr("width", d => nodeSize * 2)
        .attr("height", d => nodeSize * 2);
    fitNodeText();
}   
function updateNodeSelections(){
    nodeGroupSelection = nodeArea.selectAll("g.node-group")
        .data(nodes, d => d.name);
    nodeSelection = nodeGroupSelection.selectAll("circle.node");
    nodeTextSelection = nodeGroupSelection.selectAll("foreignObject");
}

function fitNodeText(){
// Transform the text (the child node of each "div.node-text") to make the height and width fit the box that circumscribes that node's circle (divide radius by root(2))
    // Get list of nodes using querySelector, so you can use getComputedStyle
    let resizedNodes = document.querySelectorAll(".node-text div");
    let maxWidth = 1.1 * nodeSize * Math.sqrt(2);
    for(node of resizedNodes){
        // get width and font-size
        let d3node = d3.select(node);
        d3node.style("transform", "scale(1)");
        let nodeStyle = window.getComputedStyle(node),
            width = parseInt(nodeStyle.getPropertyValue("width").slice(0, -2)),
            height = parseInt(nodeStyle.getPropertyValue("height").slice(0, -2));
        let heightRatio = maxWidth / height,
            widthRatio = maxWidth / width,
            transformRatio = height > width ? heightRatio : widthRatio;
        d3node.style("transform", `scale(${transformRatio})`);
    }
}

  //=================//
 // Toolwheel logic //
//=================//
// Set distance of tool bubble from node and size of bubble
let toolLength = 110;
let toolSize = 45;

let tools = [
    { name: "Expand", f: showLinks, class: "show-links"},
    { name: "Add Link", f: addLink, class: "add-link"},
    // { name: "Location", f: heatmap},
    // { name: "Projects", f: showProjects},
    { name: "Wiki", f: goToWiki, class: "wiki-link"},
    { name: "Unload", f: unload, class: "unloader"}
];
toolwheel
    .classed("hidden", true);

    
let toolGroupSelection = toolwheel.selectAll(".tool")
    .data(tools);
let toolBubbles = toolGroupSelection.selectAll("circle");
let toolTexts = toolGroupSelection.selectAll("foreignObject");

updateTools();
function updateTools(){
    let toolGroupEnter = toolGroupSelection
        .enter()
            .append("g")
            .attr("class", d => d.class)
            .classed("tool", true)
            .on("click", d => d.f());
    let toolBubbleEnter = toolGroupEnter.append("circle")
        .attr("fill", "lavender")
    let toolTextEnter = toolGroupEnter
        .append("foreignObject")
            .attr("pointer-events", "none");
    toolTextEnter
        .append("xhtml:div")    // https://stackoverflow.com/questions/13848039/svg-foreignobject-contents-do-not-display-unless-plain-text
            .classed("tool-text", true)
            .attr("xmlns", "http://www.w3.org/1999/xhtml")
            .text(d => d.name)
            .attr("pointer-events", "none");
    toolGroupSelection = toolGroupEnter.merge(toolGroupSelection);
    toolTexts = toolTextEnter.merge(toolTexts);
    toolBubbles = toolBubbleEnter.merge(toolBubbles);
    
    let coords = getRadialCoordinates(toolBubbles.size(), toolLength);

    toolBubbles
        .attr("cx", (d, i) => coords[i].x)
        .attr("cy", (d, i) => coords[i].y)
        .attr("r", toolSize);
    toolTexts
        .attr("width", d => toolSize * 2)
        .attr("height", d => toolSize * 2)
        .attr("x", (d, i) => coords[i].x - toolSize)
        .attr("y", (d, i) => coords[i].y - toolSize);
}

  //========================//
 // Force simulation logic //
//========================//

let width = parseInt(svg.style("width"));
let height = parseInt(svg.style("height"));
let sim;
initializeSim();
function initializeSim(){
    sim = d3.forceSimulation(nodes, d => d.name);
    sim
        .force("xGravity", d3.forceX(width/2).strength(.005))
        .force("yGravity", d3.forceY(height/2).strength(.005))
        .force("repulsion", d3.forceManyBody().strength(-30))
        .force("attraction", d3.forceLink(links)
                                .id(d => d._id)
                                .distance(350)
                                .strength(.01)
            )
        .force('collision', d3.forceCollide().radius(nodeSize + 10))
        .on("tick", ticked);
}
function ticked(){
    nodeSelection
        .attr("cx", d => constrain(d.x, 0, width))
        .attr("cy", d => constrain(d.y, 0, height));
    nodeTextSelection
        .attr("x", d => constrain(d.x - nodeSize, 0 - nodeSize, width - nodeSize))
        .attr("y", d => constrain(d.y - nodeSize, 0 - nodeSize, height - nodeSize));
    linkBoxes
        .attr("x1", d => constrain(d.source.x, 0, width))
        .attr("y1", d => constrain(d.source.y, 0, height))
        .attr("x2", d => constrain(d.target.x, 0, width))
        .attr("y2", d => constrain(d.target.y, 0, height));
    linkPaths
        .attr("x1", d => constrain(d.source.x, 0, width))
        .attr("y1", d => constrain(d.source.y, 0, height))
        .attr("x2", d => constrain(d.target.x, 0, width))
        .attr("y2", d => constrain(d.target.y, 0, height));
    linkArrows
        .attr("points", d => placeArrow(d));
    if(activeLink){
        activeLinkCoords.x = (activeLink.source.x + activeLink.target.x) / 2;
        activeLinkCoords.y = (activeLink.source.y + activeLink.target.y) / 2;
        linkButtons
            .attr("transform", `translate(${activeLinkCoords.x}, ${activeLinkCoords.y})`);
    }
}
function constrain(value, min, max){
    if(value < min){
        return min;
    } else if(value > max){
        return max;
    }
    else {
        return value;
    }
}
function placeArrow(linkDatum){
    let px1 = linkDatum.source.x,
        py1 = linkDatum.source.y,
        px2 = linkDatum.target.x,
        py2 = linkDatum.target.y,
        dx = px2 - px1,
        dy = py2 - py1,
        linkLength = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)),
        // angle = Math.PI/2 - Math.atan((py2 - py1), (px2 - px1)),
        xBase = (px1 + px2)/2,
        yBase = (py1 + py2)/2,
        xAdjust = arrowSize * dx / linkLength,
        yAdjust = arrowSize * dy / linkLength;
    let x1 = xBase + arrowSize * dy / linkLength - xAdjust,
        y1 = yBase - arrowSize * dx / linkLength - yAdjust,
        x2 = xBase,
        y2 = yBase,
        x3 = xBase -arrowSize * dy / linkLength - xAdjust,
        y3 = yBase + arrowSize * dx / linkLength - yAdjust;
    return `${x1}, ${y1} ${x2}, ${y2} ${x3}, ${y3}`
}
function updateSimData(){
    sim.nodes(nodes, d => d.name);
    // sim.on("tick", () => {
    //     nodeSelection
    //         .attr("cx", d => d.x)
    //         .attr("cy", d => d.y);
    //     nodeTextSelection
    //         .attr("x", d => d.x - nodeSize)
    //         .attr("y", d => d.y - nodeSize);
    //     linkBoxes
    //         .attr("x1", d => d.source.x)
    //         .attr("y1", d => d.source.y)
    //         .attr("x2", d => d.target.x)
    //         .attr("y2", d => d.target.y);
    //     linkPaths
    //         .attr("x1", d => d.source.x)
    //         .attr("y1", d => d.source.y)
    //         .attr("x2", d => d.target.x)
    //         .attr("y2", d => d.target.y);
    // });
    sim.force("attraction").links(links);       // TODO: use edge id's as identifier in .links call
    sim.alpha(1).restart();
}
function updateSimDimensions(){
    width = parseInt(svg.style("width"));
    height = parseInt(svg.style("height"));
    if(window.innerWidth <= 900 && window.innerWidth > 650){
        toolSize = 35;
        toolLength = 90;
        nodeSize = 40;
        sim.force("collision", d3.forceCollide().radius(nodeSize + 6));
    }
    else if(window.innerWidth < 650){
        toolSize = 25;
        toolLength = 70;
        nodeSize = 30;
        sim.force("collision", d3.forceCollide().radius(nodeSize + 3));
    }
    else {
        toolSize = 45;
        toolLength = 110;
        nodeSize = 50;
        sim.force("collision", d3.forceCollide().radius(nodeSize + 10));
    }
    if(activeNode){
        let d = d3.select(activeNode).datum();
        if(d.fx > width - 100 && width > 200){
            d.fx = width - 100;
        }
        else if(d.fx < 100){
            d.fx = 100;
        }
        if(d.fy > height - 100 && height > 200){
            d.fy = height - 100;
        }
        else if(d.fy < 100){
            d.fy = 100;
        }
        let toolWidth = parseInt(toolwheel.style("width"));
        let toolHeight = parseInt(toolwheel.style("height"));
        toolwheel
            .attr("transform", `translate(${d.fx - toolWidth/2}, ${d.fy - toolHeight/2})`);
    }
    updateTools();
    updateNodes();
    sim
        .force("xGravity")
            .x(width/2);
    sim
        .force("yGravity")
            .y(height/2);
    sim.alpha(1).restart();
}

// Load graph from cookies
loadLastGraph();
async function loadLastGraph(){
    await loadGraphFromCookie();
    updateNodes();
    updateLinks();
    updateSimData();
    sim.on("tick", ticked);
}


window.addEventListener('resize', updateSimDimensions);

function dragStart(d) {
    // console.log("Start");
    sim.alphaTarget(.01).restart();
    d.fx = d.x;
    d.fy = d.y;
    issueSearchbar.classed("hidden",true);
}
function drag(d) {
    // console.log("dragging");
    d3.event.sourceEvent.stopPropagation();
    d.fx = d3.event.x;
    d.fy = d3.event.y;
    if(this === activeNode){
        let toolWidth = parseInt(toolwheel.style("width"));
        let toolHeight = parseInt(toolwheel.style("height"));
        toolwheel
            .attr("transform", `translate(${d.fx - toolWidth/2}, ${d.fy - toolHeight/2})`);
    }
}
function dragEnd(d) {
    // console.log("End");
    sim.alphaTarget(0);
    if(this !== activeNode){
        d.fx = null;
        d.fy = null;
    }
}

function toggleTools(d) {
    if (d3.event.defaultPrevented) return;
    sim.alphaTarget(0);
    issueSearchbar.classed("hidden", true);
    linkButtons.classed("hidden", true);

    if(this === activeNode){
        toolwheel.classed("hidden", true);
        d.fx = null;
        d.fy = null;
        activeNode = null;
    }
    else {
        if(activeNode){
            d3.select(activeNode).datum().fx = null;
            d3.select(activeNode).datum().fy = null;
        }
        d.fx = d.x;
        d.fy = d.y;
        activeNode = this;
        let toolWidth = parseInt(toolwheel.style("width"));
        let toolHeight = parseInt(toolwheel.style("height"));
        toolwheel.classed("hidden", false)
            .attr("transform", `translate(${d.fx - toolWidth/2}, ${d.fy - toolHeight/2})`);    
    }
}

  //==================//
 // Helper functions //
//==================//
// Return a color for a node based on whether it's a project, issue, etc.
function colorNode(node){
    const key = {
        "issue": "rgb(141, 141, 241)",
        "project": "orange"
    }
    return key[node.type];
}
// Return an array of x and y coordinates for equidistant radial positions
function getRadialCoordinates(numberOfChunks, radius){
    let coordinates = [];
    let chunkRads = Math.PI*2/numberOfChunks;
    for(let i = 0; i < numberOfChunks; i++){
        coordinates.push({
            x: Math.sin(i * chunkRads) * radius,
            y: -Math.cos(i * chunkRads) * radius
        });
    }
    return coordinates;
}
function renderLinkArrow(){
    let path="";
    return path;
}
function handleErrors(res){
    if(!res.ok){
      throw Error(res.status);
    }
    return res;
  }

// TO DO: logic for whether the user has voted for this connection already (a query for the user's vote)
function toggleLinkTools(link){
    if (d3.event.defaultPrevented) return;
    sim.alphaTarget(0);
    issueSearchbar.classed("hidden", true);
    toolwheel.classed("hidden", true);

    if(link === activeLink){
        linkButtons.classed("hidden", true);
        activeLink = null;
    }
    else {
        activeLink = link;
        colorVote();
        linkButtons.classed("hidden", false);
        linkUpvoter.on("click", d => upvoteLink(activeLink.source._id, activeLink.target._id));
        linkDownvoter.on("click", d => downvoteLink(activeLink.source._id, activeLink.target._id));
        activeLinkCoords.x = (activeLink.source.x + activeLink.target.x) / 2;
        activeLinkCoords.y = (activeLink.source.y + activeLink.target.y) / 2;
        linkButtons.attr("transform", `translate(${activeLinkCoords.x}, ${activeLinkCoords.y})`);
    }

}
  //================//
 // Tool functions //
//================//

function issueLoadSearch(){
    let input = String(issueToLoad.property("value"));
    let results = issueSearch(input);
    if(input !== ""){
        results = issues.filter(issue => {
            return issue.name.toLowerCase().includes(input.toLowerCase());
        });
        loadedIssues.classed("hidden", false);
    }
    else{
        loadedIssues.classed("hidden", true);
    }
    let issueSearchResults = loadedIssues.selectAll(".result")
        .data(results, issue => issue.name);
    issueSearchResults
        .enter()
        .append("div")
            .classed("result", true)
            .text(issue => issue.name)
            .on("click", issue => tryLoad(issue._id));
    issueSearchResults
        .exit()
            .remove();
}
async function tryLoad(issueID){
    // console.log(issueID);
    const alreadyLoaded = nodes.findIndex(node => {
        return node._id == issueID;
    });
    if(alreadyLoaded === -1){
        // console.log(issues);
        let addedIssue = issues.find(node => node._id == issueID);
        if(!addedIssue){
            await fetch(baseURL + `issue/data/${nodeID}`)
                .then(res => handleErrors(res))
                .then(res => res.json())
                .then(res => addedIssue = res)
                .catch(err => {
                    console.log(err)
                });
        }
        // Set the spawn point on the forcegraph here
        // if(activeNode){
        //     console.log(d3.select(activeNode).attr("cx"));
        // }
        addedIssue.x = parseInt(svg.style("width"))/3;
        addedIssue.y = parseInt(svg.style("height"))/3;
        nodes.push(addedIssue); // transition this to a call to the API.
        updateNodes();
        updateSimData();
    }
    issueToLoad.property("value", "");
    loadedIssues.classed("hidden", true);
    saveNodesToCookie(); // in "cookie handling"
}

function heatmap() {
    displayTest("HEATMAP");
}
// Adds link to force graph without sending anything to the server
async function showLinks(){
    const root = d3.select(activeNode).datum()
    let topLinks = await linkSearch(root._id);
    // console.log(topLinks);
    if(topLinks && topLinks.length > 0){
        for(link of topLinks){
            showLink(root._id, link.vertex);
        };
    }
    //add in logic to add links to anything present if it's in the top ?% of the links
}
async function linkSearch(sourceID){
    // TO DO: expand gets new links, up to X?
    let topFiveLinks = await fetch(baseURL + `issue/toplinks/5/${sourceID}`)
        .then(res => handleErrors(res))
        .then(res => res.json())
        .catch(err => {
            console.log(err);
        });
    // console.log(topFiveLinks);
    return topFiveLinks;
}
function addLink() {
    toggleIssueSearchbar();
    document.querySelector("#issue-searchbar input").focus();
    d3.select("#link-source")
        .text(d3.select(activeNode).datum().name);
}
function tryLink(){
    if(document.querySelector("#found-link-issues").childNodes.length !== 0){
        setLink(d3.select(activeNode).datum()._id, d3.select("#found-link-issues").select(".result").datum()._id);
    }
}
async function setLink(sourceID, targetID) {
    await fetch(`${baseURL}issue/link/${sourceID}/${targetID}`, {
        method: "PUT"
    })
    .then(res => handleErrors(res))
    .then(res => res.text())
    .then(res => handleVoteResponse(res))
    .catch(err => {
        return console.log(err);
    });
    showLink(sourceID, targetID);
    loadVotes();
}
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
        
        userEdgevotes = currentUser.edgeVotes;
    }
    
}
function colorVote(){
    if(activeLink && userEdgevotes.length > 0){
        let votesFromSource = userEdgevotes.find(voteSet => voteSet.source == activeLink.source._id);
        if(votesFromSource){
            let voteToTarget = votesFromSource.targets.find(v => v.target == activeLink.target._id);
            if(voteToTarget){
                if(voteToTarget.vote){
                    linkUpvoter.classed("upvoted", true);
                    linkDownvoter.classed("downvoted", false);
                    return;
                }
                else{
                    linkDownvoter.classed("downvoted", true);
                    linkUpvoter.classed("upvoted", false);
                    return;
                }
            }
        }
    }
    linkUpvoter.classed("upvoted", false);
    linkDownvoter.classed("downvoted", false);
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
    await loadVotes();
    colorVote();
    if(!links.find(link => {
        return (link.source._id == sourceID && link.target._id == targetID);
    })){
        let toAddBack = {
            source: sourceID,
            target: targetID
        };
        links.push(toAddBack);
        updateLinks();
        updateSimData();
        saveLinksToCookie(); // in "cookie handling"
    }
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
    await loadVotes();
    colorVote();
    console.log(`${sourceID}, ${targetID}`);
    let toRemove = links.findIndex(link => link.source._id == sourceID && link.target._id == targetID);
    if(toRemove != -1){    
        links.splice(toRemove, 1);
        updateLinks();
        updateSimData();
        saveLinksToCookie(); // in "cookie handling"
    } else {
        console.log("Couldn't find that link in the links array for some reason");
    }

}
function handleVoteResponse(response){
    console.log(response);
}
function showLink(sourceID, targetID){
    if(sourceID === targetID){
        return;
    }
    tryLoad(targetID);
    let newLink = {
        source: sourceID, 
        target: targetID
    };
    if(!links.some(link => {
        
        return ((link.source._id === newLink.source && link.target._id === newLink.target) || (link.source._id === newLink.target && link.target._id === newLink.source));
    })){
        links.push(newLink);
        updateLinks();
        updateSimData();
        saveLinksToCookie(); // in "cookie handling"
    } else {
        console.log("Those two are already linked!");
    }
}
function showProjects(){
    displayTest("PROJECTS");
}
function goToWiki(){
    window.location.href = `/wiki/${d3.select(activeNode).datum()._id}`;
}
function unload(){
    let toUnload = d3.select(activeNode).datum().name;
    links = links.filter(link => link.source.name != toUnload && link.target.name != toUnload);
    console.log(links);
    toolwheel.classed("hidden", true);
    activeNode = null;
    nodes = nodes.filter(node => node.name != toUnload);
    updateNodes();
    saveNodesToCookie();
    updateLinks();
    saveLinksToCookie();
    updateSimData();
    
}
function issueSearch(input){
    if(input){
        return issues.filter(issue => {
            return issue.name.toLowerCase().includes(input.toLowerCase());
        });
    }
    else return [];
}
let issueSearchResults;
function issueLinkSearch(){
    let input = String(d3.select("#issue-searchbar").select("input").property("value"));
    let results = issueSearch(input);
    issueSearchResults = d3.select("#found-link-issues").selectAll(".result")
        .data(results, issue => issue.name);
    issueSearchResults
        .exit()
            .remove();
    issueSearchResults
        .enter()
        .append("div")
            .classed("result", true)
            .text(issue => issue.name)
            .on("click", issue => setLink(d3.select(activeNode).datum()._id, issue._id));
}
function toggleIssueSearchbar(){
    issueSearchbar.classed("hidden", !issueSearchbar.classed("hidden"));
}
function displayTest(str){
    d3.selectAll(".test").remove();
    let data = activeNode ? d3.select(activeNode).datum().name : "No active node";
    d3.select("#allContent").append("h1")
        .classed("test", true)
        .text(`${str} - ${data}`);
}

  //=================//
 // COOKIE HANDLING //
//=================//

function saveLinksToCookie(){
    let linksString = "";
    for(link of links){
        linksString += `#${link.source._id}@${link.target._id}`
    }
    document.cookie = `links=${linksString}`;
}
function saveNodesToCookie(){
    let nodesString = "";
    for (node of nodes){
        nodesString += `#${node._id}`;
    }
    document.cookie = `nodes=${nodesString}`;
}

async function loadGraphFromCookie(){
    // Cookies are given by document cookie, which returns a string of all cookies separated by semicolons. This function parses the cookies for nodes and links.
    let cookieString = document.cookie,
        nodesIndexInCookies = cookieString.indexOf("nodes=");
    // Parse nodes from cookies
    if(nodesIndexInCookies >= 0){
        let nodesEndInCookies = cookieString.indexOf(";", nodesIndexInCookies);
        if(nodesEndInCookies < 0){
            nodesEndInCookies = cookieString.length;
        }
        let nodesString = cookieString.slice(nodesIndexInCookies + 6, nodesEndInCookies),
            nodeIDArray = [];
        if(nodesString.length > 0){
            nodesString = nodesString.slice(1);
            nodeIDArray = nodesString.split("#");
        }
        // And use those objectIDs to load the data from the server.
        for(nodeID of nodeIDArray){
            await tryLoad(nodeID);
        }
    } 
    // Parse links from cookies
    let linksIndexInCookies = cookieString.indexOf("links=");
    if(linksIndexInCookies >= 0){
        let linksEndInCookies = cookieString.indexOf(";", linksIndexInCookies);
        if(linksEndInCookies < 0){
            linksEndInCookies = cookieString.length;
        }
        let linksString = cookieString.slice(linksIndexInCookies + 6, linksEndInCookies),
            linksStaging = [];
        if(linksString.length > 0){
            linksString = linksString.slice(1);
            linksStaging = linksString.split("#");
            for(link of linksStaging){
                let newLink = link.split("@");
                links.push({
                    source: newLink[0],
                    target: newLink[1]
                });
                updateSimData();
            }
        }
        
    }   
}
  //=====================//
 // Sub-window handling //
//=====================//

function showcase(div){
    d3.select(div).classed("showcased", true)

}
function deShowcase(div){
    d3.select(div).classed("showcased", false)
}