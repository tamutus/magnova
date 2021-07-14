const baseURL = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port + "/";

const pageID = window.location.pathname.slice(6);
console.log(pageID);

// Fetch all issues                 //* This will need to be refactored, obviously, to do specific searches on a fetch performed during 
let comments = [],
    currentThread = {},
    commentSelection = d3.select("#comments").selectAll("div.comment"),
    scrollReturn,
    currentUserID = "",
    currentUser,
    styleVars = document.documentElement;

const   currentUserIdDiv = d3.select("#hidden-user-id"),
        threadViewer = d3.select("#thread-viewer"),
        viewerBackdrop = d3.select(".viewer-backdrop"),
        threadContents = threadViewer.select("#thread-contents"),
        threadIndex = threadContents.select("#thread-index"),
        threadTitle = threadContents.select("#thread-title"),
        commentBox = threadContents.select("#comment-container"),
        newCommentInput = threadContents.select("#new-comment");
if(!currentUserIdDiv.empty()){
    currentUserID = currentUserIdDiv.text();
}

let tinyInput, tinyAppBox;
tinymce.init({
    selector: '#new-comment',
    plugins: 'autosave emoticons autoresize',
    toolbar: 'fullscreen',
    max_height: 600,
    setup: editor => {
        editor.on('init', function() {
            tinyInput = d3.select("#tinymce");
            tinyAppBox = commentBox.select("div.tox.tox-tinymce");
            styleVars.style.setProperty('--editorHeight', `${tinyAppBox.style("height")}`);
        });
        editor.on("input", e => {
            styleVars.style.setProperty('--editorHeight', `${tinyAppBox.style("height")}`);
            // console.log(commentBox.style("height"));
        });
    }
});

async function openThread(div){
    let threadToOpen = d3.select(div);
    let index = threadToOpen.attr("id").slice(7);
    
    // To have the URL reflect what you've opened, a URLSearchParams object is constructed and pushed with the window.history interface.
    const params = new URLSearchParams(window.location.search);
    params.set("thread", index);
    window.history.pushState({}, '', window.location.pathname + "?" + params.toString());
    
    openThreadAtIndex(index);
}
function loadCommentAtIndex(index){
    if(comments.length > index){
        document.getElementById(`comment_${index}`).scrollIntoView({
            behavior: "smooth"
        });
    }
    else {
        console.log("Not enough comments to scroll to that index");
    }
}
window.addEventListener("popstate", event => {
    const params = new URLSearchParams(window.location.search);
    if(!params.has("thread")){
        threadIndex.text("");
        threadViewer.classed("hidden", true);
        viewerBackdrop.classed("hidden", true);
        window.scrollTo({
            top: scrollReturn,
            left: 0,
            behavior: "smooth"
        });
    } else {
        if(params.has("comment")){
            openThreadAtIndex(params.get("thread"), params.get("comment"))
        } else{
            openThreadAtIndex(params.get("thread"));
        }
    }
    
});
async function openThreadAtIndex(index, commentIndex){
    threadIndex.text(index);

    await fetch(`${baseURL}talk/threaddata/${pageID}/${index}`)
        .then(res => handleErrors(res))
        .then(res => res.json())
        .then(res => showComments(res))
        .catch(err => {
            console.log(err)
        });
    threadViewer.classed("hidden", false);
    viewerBackdrop.classed("hidden", false);
    scrollReturn = window.scrollY;
    
    if(commentIndex){
        loadCommentAtIndex(commentIndex);
    } else {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth"
        });
    }
    
}
function closeThread(){
    threadIndex.text("");
    threadViewer.classed("hidden", true);
    viewerBackdrop.classed("hidden", true);
    window.scrollTo({
        top: scrollReturn,
        left: 0,
        behavior: "smooth"
    });
    window.history.pushState({}, '', window.location.pathname);
}
function handleErrors(res){
    if(!res.ok){
      throw Error(res.status);
    }
    return res;
  }

function showComments(thread){
    currentThread = thread;
    comments = thread.comments;
    threadTitle.text(thread.subject);
    updateComments();
}

function updateComments(){
    commentSelection = d3.select("#comments").selectAll("div.comment").data(comments);
    let commentEnter = commentSelection
        .enter()
        .append("div")
            .classed("comment", true)
            .attr("id", c => `comment_${currentThread.comments.indexOf(c)}`)
    commentEnter
        .append("div")
            .classed("comment-author", true)
            .html(c => {
                // let commentDate = new Intl.DateTimeFormat('en-US', {year: 'numeric', month: 'numeric', day: 'numeric', hour: "numeric", minute: "numeric", timeZoneName: 'short'}).format(c.date);
                let commentDate = new Intl.DateTimeFormat('en-US', {year: 'numeric', month: 'numeric', day: 'numeric', hour: "numeric", minute: "numeric", timeZoneName: 'short'}).format(Date.parse(c.date));
                return `<a href="/users/${c.author.username}"><img class="pfp" src=${c.author.pfpLink}>${c.author.username}</a><br>${commentDate}`
            });
    commentEnter
        .append("div")
            .classed("comment-text", true)
            .html(c => c.text);
    commentEnter
        .append("div")
            .classed("comment-buttons", true);
    let yourCommentSelection = commentEnter.filter(c => c.author._id == currentUserID);
    yourCommentSelection
        .classed("your-comment", "true")
            .select(".comment-buttons")
            .append("div")
                .classed("delete-button", true)
                .text("DELETE COMMENT")
                .on("click", c => {
                    deleteComment(c);
                })
    commentSelection
        .exit()
            .remove();
    commentSelection = commentSelection.merge(commentEnter);
    
}
async function postComment(){
    let newComment = tinymce.activeEditor.getContent();
    console.log(newComment);
    if(newComment.length > 0){
        console.log(`${baseURL}talk/comment/${pageID}/${threadIndex.text()}`);
        await fetch(`${baseURL}talk/comment/${pageID}/${threadIndex.text()}`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ comment: newComment})
        })
        .then(res => handleErrors(res))
        .then(res => res.json())
        .then(commentResponse => addComment(commentResponse))
    }
}
function addComment(comment){
    if(comment != {}){
        comments.push(comment);
        updateComments();
        loadCommentAtIndex(comments.length-1);
        const params = new URLSearchParams(window.location.search);
        params.set("comment", comments.length-1);
        window.history.pushState({}, '', window.location.pathname + "?" + params.toString());
        tinymce.activeEditor.setContent("");
    }
}
async function deleteComment(comment){
    console.log(`${baseURL}talk/comment/${comment._id}`);
    fetch(`${baseURL}talk/comment/${comment._id}`, {
        method: "DELETE"
    })
    .then(res => handleErrors(res))
    .then(res => res.text())
    .then(res => {
        if(res == "Success"){
            comments.splice(comments.indexOf(comment), 1);
            updateComments();
            const params = new URLSearchParams(window.location.search);
            params.delete("comment");
            window.history.pushState({}, '', window.location.pathname + "?" + params.toString());
        } else {
            console.log(res);
        }
    });

}
