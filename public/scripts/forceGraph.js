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
    projects = [],
    loggedIn = document.querySelector("#username"),
    currentUser,
    userEdgevotes = [],
    userProjectvotes = [];

let links = [];

// Load graph from cookies

//     { source: "Climate Change", target: "Poverty"}

// Set node and arrow size
let nodeSize = 50,
    nodeFontSize = 20,
    arrowSize = 20;

// Keeps track of which node has been clicked, for which the tool wheel shall open
let activeNode = null;   
// Keeps track of which link was most recently clicked, so its center can be tracked and the link buttons can be moved. Both of theses things happen in the tick function.
let activeLink = null,
    activeLinkCoords = {x: 0, y: 0};


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
    projectSearchbar = d3.select("#project-searchbar"),
    issueToLink = issueSearchbar.select("input"),
    projectToLink = projectSearchbar.select("input"),
    issueLoadButton = d3.select("#fg-utilities").select("#load-issue-button"),
    projectLoadButton = d3.select("#fg-utilities").select("#load-project-button"),
    clearButton = d3.select("#fg-utilities").select("#clear-button"),
    createButton = d3.select("#fg-utilities").select("#create-button"),
    issueLoader = d3.select("#issue-loader"),
    issueLoaderPrompt = issueLoader.select("#issue-loader-prompt"),
    issueToLoad = issueLoader.select("#issue-to-load"),
    loadedIssues = issueLoader.select("#loaded-issues");
    projectLoader = d3.select("#project-loader"),
    projectLoaderPrompt = projectLoader.select("#project-loader-prompt"),
    projectToLoad = projectLoader.select("#project-to-load"),
    loadedProjects = projectLoader.select("#loaded-projects"),
    issueSource = d3.selectAll(".issue-source"),
    projectSource = d3.selectAll(".project-source");

  //================================//
 // Attach functions to DOM events //
//================================//

issueLoadButton.on("click", () => {
    projectLoader.classed("hidden", true);
    projectLoadButton.classed("pressed", false);
    issueLoader.classed("hidden", !issueLoader.classed("hidden"));
    issueLoadButton.classed("pressed", !issueLoadButton.classed("pressed"));
});
projectLoadButton.on("click", () => {
    issueLoader.classed("hidden", true);
    issueLoadButton.classed("pressed", false);
    projectLoader.classed("hidden", !projectLoader.classed("hidden"));
    projectLoadButton.classed("pressed", !projectLoadButton.classed("pressed"));
});
clearButton.on("click", () => {
    issueSearchbar.classed("hidden", true);
    projectSearchbar.classed("hidden", true);
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

issueToLink.on("change", issueLinkSearch);
issueToLoad.on("change", issueLoadSearch);
projectToLink.on("change", projectLinkSearch);
projectToLoad.on("change", projectLoadSearch);

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
            .classed("project", d => d.type == "project")
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
        .data(nodes, d => d._id);
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

let issueTools = [
    { name: "Causes", f: showLinks, class: "show-links"},
    { name: "Link Issue", f: linkIssue, class: "add-link"},
    { name: "Link Project", f: linkProject, class: "add-link"},
    { name: "Unload", f: unload, class: "unloader"},
    { name: "Wiki", f: goToWiki, class: "wiki-link"},
    { name: "Projects", f: showProjects, class: "show-links"}
    // { name: "Location", f: heatmap},
];
let projectTools = [
    { name: "Issues", f: showLinks, class: "show-links"},
    // { name: "Location", f: heatmap},
    { name: "Link Issue", f: linkIssue, class: "add-link"},
    { name: "Unload", f: unload, class: "unloader"},
    { name: "Wiki", f: goToWiki, class: "wiki-link"}
]

toolwheel.classed("hidden", true);
    
let toolGroupSelection,
    toolBubbles,
    toolTexts;
updateTools(issueTools);

function updateTools(toolset){
    if(toolset){
        toolGroupSelection = toolwheel.selectAll(".tool").data(toolset, d => d.name);
        
        let toolGroupEnter = toolGroupSelection
            .enter()
                .append("g")
                .attr("class", d => d.class)
                .classed("tool", true)
                .on("click", d => d.f());
        
        let toolBubbleEnter = toolGroupEnter.append("circle")
            .attr("fill", "lavender");
        
        let toolTextEnter = toolGroupEnter
            .append("foreignObject")
                .attr("pointer-events", "none");
        toolTextEnter
            .append("xhtml:div")    // https://stackoverflow.com/questions/13848039/svg-foreignobject-contents-do-not-display-unless-plain-text
                .classed("tool-text", true)
                .attr("xmlns", "http://www.w3.org/1999/xhtml")
                .text(d => d.name)
                .attr("pointer-events", "none");

        toolGroupSelection.exit().remove();
        toolGroupSelection = toolGroupSelection.merge(toolGroupEnter);
        toolTexts = toolGroupSelection.select("foreignObject");     // important to select instead of selectAll, to inherit data properly
        toolBubbles = toolGroupSelection.select("circle");
    }
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
console.log(width);
console.log(height);
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
        .attr("cx", d => constrain(d.x, 0, width + 2 * nodeSize))
        .attr("cy", d => constrain(d.y, 0, height));
    nodeTextSelection
        .attr("x", d => constrain(d.x - nodeSize, 0 - nodeSize, width + nodeSize))
        .attr("y", d => constrain(d.y - nodeSize, 0 - nodeSize, height - nodeSize));
    linkBoxes
        .attr("x1", d => constrain(d.source.x, 0, width + 2 * nodeSize))
        .attr("y1", d => constrain(d.source.y, 0, height))
        .attr("x2", d => constrain(d.target.x, 0, width + 2 * nodeSize))
        .attr("y2", d => constrain(d.target.y, 0, height));
    linkPaths
        .attr("x1", d => constrain(d.source.x, 0, width + 2 * nodeSize))
        .attr("y1", d => constrain(d.source.y, 0, height))
        .attr("x2", d => constrain(d.target.x, 0, width + 2 * nodeSize))
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
    // To match force graph svg styling
    width = 0.94 * parseInt(window.innerWidth) - 150;
    height = .90 * parseInt(window.innerHeight);
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
updateSimDimensions();

function dragStart(d) {
    // console.log("Start");
    sim.alphaTarget(.01).restart();
    d.fx = d.x;
    d.fy = d.y;
    issueSearchbar.classed("hidden",true);
    projectSearchbar.classed("hidden",true);
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
    projectSearchbar.classed("hidden", true);
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
        if(d.type == "project"){
            updateTools(projectTools);
        } else {
            updateTools(issueTools);
        }
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
    projectSearchbar.classed("hidden",true);
    toolwheel.classed("hidden", true);

    if(link === activeLink){
        linkButtons.classed("hidden", true);
        activeLink = null;
    }
    else {
        activeLink = link;
        colorVote();
        linkButtons.classed("hidden", false);
        if(activeLink.source.type === "issue" && activeLink.target.type === "issue"){
            linkUpvoter.on("click", d => upvoteIssueLink(activeLink.source._id, activeLink.target._id));
            linkDownvoter.on("click", d => downvoteIssueLink(activeLink.source._id, activeLink.target._id));
        } else if(activeLink.source.type ==="issue" && activeLink.target.type === "project"){
            linkUpvoter.on("click", d => upvoteProjectLink(activeLink.source._id, activeLink.target._id));
            linkDownvoter.on("click", d => downvoteProjectLink(activeLink.source._id, activeLink.target._id));
        }
        activeLinkCoords.x = (activeLink.source.x + activeLink.target.x) / 2;
        activeLinkCoords.y = (activeLink.source.y + activeLink.target.y) / 2;
        linkButtons.attr("transform", `translate(${activeLinkCoords.x}, ${activeLinkCoords.y})`);
    }

}
  //================//
 // Tool functions //
//================//

async function issueLoadSearch(){
    let input = String(issueToLoad.property("value"));
    let results = await issueSearch(input);
    if(results === "Blocked"){
        return;
    }
    if(results.length > 0){
        loadedIssues.classed("hidden", false);
    } else {
        loadedIssues.classed("hidden", true);
    }
    let issueSearchResults = loadedIssues.selectAll(".result")
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
            .on("click", issue => tryLoad(issue._id));
}
async function projectLoadSearch(){
    let input = String(projectToLoad.property("value"));
    let results = await projectSearch(input);
    if(results === "Blocked"){
        return;
    }
    if(results.length > 0){
        loadedProjects.classed("hidden", false);
    } else {
        loadedProjects.classed("hidden", true);
    }
    let projectSearchResults = loadedProjects.selectAll(".result")
        .data(results, project => project._id);
    projectSearchResults.sort((a, b) => d3.descending(a.confidenceScore, b.confidenceScore));
    projectSearchResults
        .exit()
            .remove();
    projectSearchResults
        .enter()
        .append("div")
            .classed("result", true)
            .text(project => project.name)
            .on("click", project => tryProjectLoad(project._id));
}
async function tryLoad(issueID){
    // console.log(issueID);
    const alreadyLoaded = nodes.findIndex(node => {
        return String(node._id) === String(issueID);
    });
    if(alreadyLoaded === -1){
        // console.log(issues);
        // refactoring to run a search
        let addedIssue = await fetch(baseURL + `issue/data/${issueID}`)
            .then(res => handleErrors(res))
            .then(res => res.json())
            .catch(console.error);
        // Set the spawn point on the forcegraph here
        // if(activeNode){
        //     console.log(d3.select(activeNode).attr("cx"));
        // }
        addedIssue.x = parseInt(svg.style("width"))/3;
        addedIssue.y = parseInt(svg.style("height"))/3;
        addedIssue.type = "issue";
        nodes.push(addedIssue); // transition this to a call to the API.
        updateNodes();
        updateSimData();
    }
    issueToLoad.property("value", "");
    loadedIssues.classed("hidden", true);
    saveNodesToCookie(); // in "cookie handling"
}
async function tryProjectLoad(projectID){
    const alreadyLoaded = nodes.findIndex(node => {
        return String(node._id) === String(projectID);
    });
    if(alreadyLoaded === -1){
        // refactoring to run a search
        let addedProject = await fetch(baseURL + `project/data/${projectID}`)
            .then(res => handleErrors(res))
            .then(res => res.json())
            .catch(console.error);
        // Set the spawn point on the forcegraph here
        // if(activeNode){
        //     console.log(d3.select(activeNode).attr("cx"));
        // }
        addedProject.x = parseInt(svg.style("width"))/3;
        addedProject.y = parseInt(svg.style("height"))/3;
        addedProject.type = "project";
        nodes.push(addedProject); // transition this to a call to the API.
        updateNodes();
        updateSimData();
    }
    projectToLoad.property("value", "");
    loadedProjects.classed("hidden", true);
    saveNodesToCookie(); // in "cookie handling"
}

function heatmap() {
    displayTest("HEATMAP");
}
// Adds link to issues on force graph without posting changes to the server
async function showLinks(){
    const root = d3.select(activeNode).datum();
    let topLinks = await getTopLinks(root._id);
    // console.log(topLinks);
    if(topLinks && topLinks.length > 0){
        for(link of topLinks){
            if(root.type === "issue"){
                showLink(root._id, link.vertex, "issue");
            }
            else if(root.type === "project"){
                showLink(link.vertex, root._id, "project");
            }    
        }
    }
    //add in logic to add links to anything present if it's in the top ?% of the links
}
async function showProjects(){
    const root = d3.select(activeNode).datum();
    let topProjects = await topProjectSearch(root._id);
    if(topProjects && topProjects.length > 0){
        for(project of topProjects){
            showLink(root._id, project.vertex, "project");
        }
    }
}
async function getTopLinks(sourceID){
    // TO DO: expand gets new links, up to X?
    const nodeData = d3.select(activeNode).datum();
    // This assumes it's either a project or issue. 
    const fetchURL = nodeData.type === "project" ? baseURL + `project/topissues/5/${sourceID}` : baseURL + `issue/toplinks/5/${sourceID}`;
    let topFiveLinks = await fetch(fetchURL)
        .then(res => handleErrors(res))
        .then(res => res.json())
        .catch(err => {
            console.error(err);
        });
    return topFiveLinks;
}
async function topProjectSearch(sourceID){
    let topFiveProjects = await fetch(baseURL + `issue/topprojects/5/${sourceID}`)
        .then(res => handleErrors(res))
        .then(res => res.json())
        .catch(err => {
            console.error(err);
        });
    return topFiveProjects;
}
function linkIssue() {
    toggleIssueSearchbar();
    document.querySelector("#issue-searchbar input").focus();
    d3.select("#link-source-to-issue")
        .text(d3.select(activeNode).datum().name);
}
function linkProject() {
    toggleProjectSearchbar();
    document.querySelector("#project-searchbar input").focus();
    d3.select("#link-source-to-project")
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
        .then(handleErrors)
        .then(res => res.text())
        .then(res => handleVoteResponse(res))
        .catch(console.error);
    showLink(sourceID, targetID, "issue");
    loadVotes();
}
async function setProjectLink(issueID, projectID){
    await fetch(`${baseURL}project/toissue/${projectID}/${issueID}`, {
        method: "PUT"
    })
        .then(handleErrors)
        .then(res => res.text())
        .then(res => handleVoteResponse(res))
        .catch(console.error);
    showLink(issueID, projectID, "project");
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
        .catch(console.error);
        // Get the current user's edgevotes for this issue
        
        userEdgevotes = currentUser.edgeVotes;
        userProjectvotes = currentUser.projectVotes;
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
    if(activeLink && userProjectvotes.length > 0){
        let votesFromSource = userProjectvotes.find(voteSet => voteSet.issue == activeLink.source._id);
        if(votesFromSource){
            let voteToTarget = votesFromSource.targets.find(v => v.project == activeLink.target._id);
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
async function upvoteIssueLink(sourceID, targetID) {
    await fetch(`${baseURL}issue/link/${sourceID}/${targetID}`, {
        method: "PUT"
    })
    .then(res => handleErrors(res))
    .then(res => res.text())
    .then(console.log)
    .catch(console.error);
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
async function downvoteIssueLink(sourceID, targetID){
    await fetch(`${baseURL}issue/link/${sourceID}/${targetID}`, {
        method: "DELETE"
    })
        .then(res => handleErrors(res))
        .then(res => res.text())
        .then(console.log)
        .catch(console.error);
    await loadVotes();
    colorVote();
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
//     /toissue/:projectid/:issueid
async function upvoteProjectLink(issueID, projectID) {
    await fetch(`${baseURL}project/toissue/${projectID}/${issueID}`, {
        method: "PUT"
    })
    .then(res => handleErrors(res))
    .then(res => res.text())
    .then(console.log)
    .catch(console.error);
    await loadVotes();
    colorVote();
    if(!links.find(link => {
        return (link.source._id == issueID && link.target._id == projectID);
    })){
        let toAddBack = {
            source: issueID,
            target: projectID
        };
        links.push(toAddBack);
        updateLinks();
        updateSimData();
        saveLinksToCookie(); // in "cookie handling"
    }
}
async function downvoteProjectLink(issueID, projectID){
    await fetch(`${baseURL}project/toissue/${projectID}/${issueID}`, {
        method: "DELETE"
    })
        .then(res => handleErrors(res))
        .then(res => res.text())
        .then(console.log)
        .catch(console.error);
    await loadVotes();
    colorVote();
    let toRemove = links.findIndex(link => link.source._id == issueID && link.target._id == projectID);
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
async function showLink(sourceID, targetID, targetType){
    // console.log(`Trying to link ${sourceID} to ${targetType} ${targetID}`);
    if(sourceID === targetID){
        return;
    }
    if(targetType === "project"){
        await tryLoad(sourceID);
        await tryProjectLoad(targetID);
    } else {
        await tryLoad(targetID);
    }
    let newLink = {
        source: sourceID, 
        target: targetID
    };
    if(!links.some(link => {
        return ((String(link.source._id) === String(newLink.source) && String(link.target._id) === String(newLink.target)) || (String(link.source._id) === String(newLink.target) && String(link.target._id) === String(newLink.source)));
    })){
        links.push(newLink);
        updateLinks();
        updateSimData();
        saveLinksToCookie(); // in "cookie handling"
    } else {
        console.log(`${sourceID} is already linked to ${targetType} ${targetID}`);
    }
}
function goToWiki(){
    const d = d3.select(activeNode).datum();
    if(d.type === "issue"){
        window.open(`/wiki/${d._id}`, '_blank');
    } else if(d.type === "project"){
        window.open(`/project/${d._id}`, '_blank');
    }
}
function unload(){
    let toUnload = d3.select(activeNode).datum().name;
    links = links.filter(link => link.source.name != toUnload && link.target.name != toUnload);
    toolwheel.classed("hidden", true);
    activeNode = null;
    nodes = nodes.filter(node => node.name != toUnload);
    updateNodes();
    saveNodesToCookie();
    updateLinks();
    saveLinksToCookie();
    updateSimData();
    
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
        .catch(console.error);
    return results;
}
async function projectSearch(input){
    if(input){
        let fetchString = `wiki/search?target=${encodeURIComponent(input)}&projects=true`;
        if(pendingSearch !== ""){
            pendingSearch = fetchString.slice(0);
            return "Blocked";
        }
        pendingSearch = fetchString.slice(0);
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
            if(pendingSearch !== fetchString){
                return projectFetch(pendingSearch);
            } else {
                pendingSearch = "";
                return res.projects;
            }
        })
        .catch(console.error);
    return results;
}

let issueSearchResults;
async function issueLinkSearch(){
    let input = String(issueToLink.property("value"));
    let results = await issueSearch(input);
    if(results === "Blocked"){
        return;
    }
    results = results.filter(issue => issue._id != d3.select(activeNode).datum()._id);
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
            .on("click", issue => {
                const nodeData = d3.select(activeNode).datum();
                if(nodeData.type === "issue"){
                    return setLink(nodeData._id, issue._id);
                } else if(nodeData.type === "project"){
                    return setProjectLink(issue._id, nodeData._id);
                }
            });
}

let projectSearchResults;
async function projectLinkSearch(){
    let input = String(projectToLink.property("value"));
    let results = await projectSearch(input);
    if(results === "Blocked"){
        return;
    }
    results = results.filter(project => project._id != d3.select(activeNode).datum()._id);
    projectSearchResults = d3.select("#found-link-projects").selectAll(".result")
        .data(results, project => project.name);
    projectSearchResults
        .exit()
            .remove();
    projectSearchResults
        .enter()
        .append("div")
            .classed("result", true)
            .text(project => project.name)
            .on("click", project => setProjectLink(d3.select(activeNode).datum()._id, project._id));
}
function toggleIssueSearchbar(){
    projectSearchbar.classed("hidden", true);
    if(d3.select(activeNode).datum().type === "issue"){
        projectSource.classed("hidden", true);
        issueSource.classed("hidden", false);
    }
    else if(d3.select(activeNode).datum().type === "project"){
        issueSource.classed("hidden", true);
        projectSource.classed("hidden", false);
    }
    issueSearchbar.classed("hidden", !issueSearchbar.classed("hidden"));
}
function toggleProjectSearchbar(){
    issueSearchbar.classed("hidden", true);
    projectSearchbar.classed("hidden", !projectSearchbar.classed("hidden"));
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
        nodesString += `#${node.type === "project" ? "p" : "i"}${node._id}`;
    }
    document.cookie = `nodes=${nodesString}`;
}

async function loadGraphFromCookie(){
    // Cookies are given by document cookie, which returns a string of all cookies separated by semicolons. This function parses the cookies for nodes and links.
    let cookieString = document.cookie,
        nodesIndexInCookies = cookieString.indexOf("nodes=");
    const nodePromises = [];
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
            if(nodeID.length === 24){
                nodePromises.push(
                    tryLoad(nodeID)
                );
            } else if(nodeID.length ===25) {
                if(nodeID.charAt(0) === 'i'){
                    nodePromises.push(
                        tryLoad(nodeID.slice(1))
                    );
                } else if(nodeID.charAt(0) === 'p'){
                    nodePromises.push(
                        tryProjectLoad(nodeID.slice(1))
                    );
                }
            }
        }
    } 
    await Promise.all(nodePromises).then(() => {
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
    });
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