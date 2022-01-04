const   sidebar = d3.select("#sidebar"),
        content = d3.select("#allContent"),
        menuItems = d3.selectAll("#sidebar ul li"),
        userBar = d3.select("#user-bar"),
        userInfo = d3.select("#logged-in"),
        avatar = d3.select("#user-avatar"),
        
        root = document.documentElement;

let loaders = d3.selectAll("div.loading-bar")
    .classed("hidden", true)
    .html(`
            <div class="meta-cube">
                <div class="cube" onclick="d3.select(this).classed('turned-up', !d3.select(this).classed('turned-up'));">
                    <div class="face">
                        <p>Loa</p>
                    </div>
                    <div class="face">
                        <p>ding!</p>
                    </div>
                    <div class="face"></div>
                    <div class="face"></div>
                    <div class="face"></div>
                    <div class="face"></div>
                </div>
            </div>
    `);
twistMenu();

let loaderZRotation = 0,
    loadInterval;


window.addEventListener("resize", e => {
    twistMenu();
//   root.style.setProperty('--mouse-y', e.clientY + "px");
});
window.addEventListener("scroll", e => {
    if(window.scrollY > scrollUpRef){
        scrollUpRef = window.scrollY;
    } else if(scrollUpRef - window.scrollY > 600){
        scrollUpRef = window.scrollY + 600;
    }
    updateMenuToggler();
});

avatar.on("click", toggleUserBar);
if(userInfo.empty()){
    toggleUserBar();
}
function squeezeSidebar() {
    if (sidebar.classed("collapsed")){
        sidebar.classed("peeking", true);
    }
    else {
        sidebar.classed("squeezed", true);
    }
}

// To-do: Create a list of all items that have data-titles, and create fixed-position arrows next to scrollbar to jump to parts of page with hovertext


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
    updateMenuToggler();
}

function toggleUserBar(){
    userBar.classed("collapsed", !userBar.classed("collapsed"))
    if(!userInfo.empty()){
        userInfo.classed("collapsed", !userInfo.classed("collapsed"));
    }
}

function twistMenu(){
    let twistAmount = Math.min(1, ((300 - Number(window.innerHeight)) / 150));
    root.style.setProperty('--menutwist', `${90 * twistAmount}deg`);
}

// Responsive menu toggler sizing
let scrollUpRef = window.scrollY;

function updateMenuToggler(){
    if(window.scrollY > 0 && sidebar.classed("collapsed") && (scrollUpRef - window.scrollY < 600)){
        root.style.setProperty("--menuTogglerHeight", "60px");
    } else {
        root.style.setProperty("--menuTogglerHeight", "100px");
    }
}

// Loading animation
function animateLoading(){
    loaderZRotation = 0;
    loadInterval = setInterval(revolt, 200);
}
function deanimateLoading(){
    clearInterval(loadInterval);
}
function revolt(){
    loaderZRotation += 5;
    if(loaderZRotation >= 360){
        loaderZRotation -= 360;
    }
    root.style.setProperty("--loaderZRotation", loaderZRotation + "deg");
}

function reportBug(bugdata){
    fetch("/bugreport", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        body: bugdata
    });
}
// show and hide login etc buttons based on whether you're logged in or not

// to do ******



// when shrinking window at a small size, the sidebar automatically closes
// window.onresize = function(){
// 	if(window.innerWidth <= 650 && !sidebar.classed("collapsed")){
// 		toggleSidebar();
// 	}
// };