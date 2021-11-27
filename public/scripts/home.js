const   cheatSheet  = d3.select(".cheat-sheet"),
        models      = cheatSheet.selectAll(".model"),
        notes       = models.select(".study .notes"),
        loginHighlights = d3.selectAll(".login-requirement");

loginHighlights.classed("login-requirement", d3.select("#logged-in").empty());

models.attr("onclick", "flipMe(d3.select(this));")
    .classed("no-animate", true);
models.on("click", () => d3.event.stopPropagation());
notes.on("click", () => d3.event.stopPropagation());


// cheatSheet.on("click", unflipAll);

function flipMe(div){
    div.classed("no-animate", true);
    setTimeout(() => {
        div.classed("no-animate", false);
        div.classed("flipped", !div.classed("flipped"));
    }, 1); 
}
function unflipAll(){
    models.classed("no-animate", true);
    setTimeout(() => {
        models.classed("no-animate", false);
        models.classed("flipped", false);
    }, 1); 
}