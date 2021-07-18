// const { populate } = require("../../api/user/user");

const baseURL = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port + "/";

const pageID = window.location.pathname.slice(6);

let pageData,
    threadSelection = d3.select("#threads").selectAll(".thread"),
    comments = [],
    currentThread = {},
    commentSelection = d3.select("#comments").selectAll("div.comment"),
    scrollReturn,
    currentUserID = "",
    currentUser,
    styleVars = document.documentElement;

const   currentUserIdDiv = d3.select("#hidden-user-id"),
        threadViewer = d3.select("#thread-viewer"),
        viewerBackdrop = d3.select(".viewer-backdrop"),
        threadArea = d3.select("#threads"),
        threadContents = threadViewer.select("#thread-contents"),
        threadIndexDiv = threadContents.select("#thread-index"),
        threadTitle = threadContents.select("#thread-title"),
        commentBox = threadContents.select("#comment-container"),
        newCommentInput = threadContents.select("#new-comment");
if(!currentUserIdDiv.empty()){
    currentUserID = currentUserIdDiv.text();
}

updateThreads();
async function updateThreads(){
    await fetch(`${baseURL}talk/pagedata/${pageID}`)
        .then(res => handleErrors(res))
        .then(res => res.json())
        .then(res => {
            pageData = res;
            threadArea.html("");
            threadSelection = threadArea.selectAll(".thread")
                .data(pageData.threads
                    .slice(0)
                    .sort(function(x, y){
                        return d3.ascending(y.lastActivity, x.lastActivity);
                    }), 
                    thread => thread._id
                );
            let threadEnter = threadSelection.enter()
                .append("div")
                    .classed("thread", true)
                    .attr("id", thread => `thread_${pageData.threads.findIndex(t => String(t._id) == thread._id)}`)
                    .attr("onclick", "openThread(this)");
            threadEnter.html(thread => {
                let threadPreviewHTML = `<div class="threader">
                    ${thread.subject}<br>
                    ${new Intl.DateTimeFormat('en-US', {year: 'numeric', month: 'numeric', day: 'numeric', hour: "numeric", minute: "numeric", timeZoneName: 'short'}).format(Date.parse(thread.lastActivity))}
                    </div>
                    `;
                if(thread.comments.length > 0){
                    const threadIndex = pageData.threads.findIndex(t => String(t._id) == thread._id);
                    threadPreviewHTML += `<div class="first-comment" onclick="setParams(${threadIndex}, 0); openThreadAtIndex(${threadIndex}, 0);">
                        <div class="preview-author">
                            <img class="mini-pfp" src="${thread.comments[0].author.pfpLink}">
                            <h4>${thread.comments[0].author.username}</h4>
                        </div>
                        <div class="preview-text">${thread.comments[0].text.slice(0, 140)}...</div>
                    </div>`;
                }
                if(thread.comments.length > 1){
                    const threadIndex = pageData.threads.findIndex(t => String(t._id) == thread._id);
                    threadPreviewHTML += `<div class="last-comment" onclick="setParams(${threadIndex}, ${thread.comments.length-1}); openThreadAtIndex(${threadIndex}, ${thread.comments.length-1});">
                        <div class="preview-author">
                            <img class="mini-pfp" src="${thread.comments[thread.comments.length - 1].author.pfpLink}">
                            <h4>${thread.comments[thread.comments.length - 1].author.username}</h4>
                        </div>
                        <div class="preview-text">${thread.comments[thread.comments.length - 1].text.slice(0, 140)}...</div>
                    </div>`;
                }
                return threadPreviewHTML;
            });
            
            threadSelection.exit().remove();
            
        })
        .catch(res => console.error(res));
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
    setParams(index);
    openThreadAtIndex(index);
}

function setParams(threadIndex, commentIndex){
    const params = new URLSearchParams(window.location.search);
    params.set("thread", threadIndex);
    if(commentIndex){
        params.set("comment", commentIndex);
    } else {
        params.delete("comment");
    }
    window.history.pushState({}, '', window.location.pathname + "?" + params.toString());
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
        threadIndexDiv.text("");
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
    updateThreads();
});
async function openThreadAtIndex(index, commentIndex){
    // Stop event propagation so clicking a first/last comment in a thread preview doesn't activate openThread() on top of openThreadAtIndex().
    window.event.stopPropagation();

    threadIndexDiv.text(index);

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
    threadIndexDiv.text("");
    threadViewer.classed("hidden", true);
    viewerBackdrop.classed("hidden", true);
    window.scrollTo({
        top: scrollReturn,
        left: 0,
        behavior: "smooth"
    });
    window.history.pushState({}, '', window.location.pathname);
    updateThreads();
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
    commentSelection = d3.select("#comments").selectAll("div.comment").data(comments, c => c._id);
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
        console.log(`${baseURL}talk/comment/${pageID}/${threadIndexDiv.text()}`);
        await fetch(`${baseURL}talk/comment/${pageID}/${threadIndexDiv.text()}`, {
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
