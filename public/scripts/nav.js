const sidebar = d3.select("#sidebar");
const content = d3.select("#allContent");

function squeezeSidebar() {
    if (sidebar.classed("collapsed")){
        sidebar.classed("peeking", true);
    }
    else {
        sidebar.classed("squeezed", true);
    }
}

// eliminating peeking and stretching
function unsqueezeSidebar() {
    sidebar.classed("squeezed", false);
    sidebar.classed("peeking", false);
}


// change state of sidebar from collapsed to expanded
function toggleSidebar() {
    unsqueezeSidebar();
    sidebar.classed("collapsed", !sidebar.classed("collapsed"));
    content.classed("expanded", !content.classed("expanded"));
}

// show and hide login etc buttons based on whether you're logged in or not

// to do ******



// when shrinking window at a small size, the sidebar automatically closes
// window.onresize = function(){
// 	if(window.innerWidth <= 650 && !sidebar.classed("collapsed")){
// 		toggleSidebar();
// 	}
// };