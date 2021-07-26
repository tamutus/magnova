const   sidebar = d3.select("#sidebar"),
        content = d3.select("#allContent"),
        menuItems = d3.selectAll("#sidebar ul li"),
        userBar = d3.select("#user-bar"),
        userInfo = d3.select("#logged-in"),
        avatar = d3.select("#user-avatar");

let root = document.documentElement;
twistMenu();

window.addEventListener("resize", e => {
    twistMenu();
//   root.style.setProperty('--mouse-y', e.clientY + "px");

});
avatar.on("click", toggleUserBar);

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

function toggleUserBar(){
    userBar.classed("collapsed", !userBar.classed("collapsed"))
    userInfo.classed("collapsed", !userInfo.classed("collapsed"));
}

function twistMenu(){
    let twistAmount = Math.min(1, ((300 - Number(window.innerHeight)) / 150));
    root.style.setProperty('--menutwist', `${90 * twistAmount}deg`);
}

// show and hide login etc buttons based on whether you're logged in or not

// to do ******



// when shrinking window at a small size, the sidebar automatically closes
// window.onresize = function(){
// 	if(window.innerWidth <= 650 && !sidebar.classed("collapsed")){
// 		toggleSidebar();
// 	}
// };