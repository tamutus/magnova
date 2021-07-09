const baseURL = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port + "/";

const pageID = window.location.pathname.slice(6);

// Fetch all issues                 //* This will need to be refactored, obviously, to do specific searches on a fetch performed during 
let comments = [],
    currentThread = {},
    commentSelection = d3.select("#comments").selectAll("div.comment"),
    scrollReturn,
    currentUserID = "",
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
    plugins: 'autosave emoticons autoresize fullscreen',
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
            .text(c => c.text);
    let yourCommentSelection = commentEnter.filter(c => c.author._id == currentUserID);
    yourCommentSelection
        .classed("your-comment", "true")
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
    let newComment = newCommentInput.property("value");
    if(newComment.length > 0){
        
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
    updateComments();
}
function addComment(comment){
    if(comment != {}){
        comments.push(comment);
    }
}
async function deleteComment(comment){
    
}