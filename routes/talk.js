const	express = require('express'),
		router = express.Router(),
		Talkpage = require("../api/comments/talkpage.model"),
        Comment = require("../api/comments/comment.model"),
        Issue = require('../api/issue/issue.template'),
        LocalIssue = require('../api/issue/issue.local'),
		Project = require('../api/project/project.template'),
        LocalProject = require('../api/project/project.local'),
        Task = require('../api/task/task.template'),
        LocalTask = require('../api/task/task.local'),
        Location = require("../api/maps/location.model"),
		User = require("../api/user/user");

const { isLoggedIn } = require("../middleware");

router.get("/", (req, res) => {
    Comment.find({})
        .populate("topic")
        .exec((err, comments) => {
            return res.render("talk/landing", {
                title: "Public Discussions on Magnova",
                comments: comments
            });
        });
});
router.get("/silence", (req, res) => {
    return res.status(404).render("talk/silence", {
        title: "Magnova — Silence (404)"
    });
});

router.post("/newthread/:talkpageid", isLoggedIn, async (req, res) => {
    if(req.params.talkpageid.match(/^[0-9a-fA-F]{24}$/)){
        Talkpage.findById(req.params.talkpageid, async (err, page) => {
            if(err){
                console.log(err);
                return res.redirect("back");
            }
            else{
                if(!page.threads.find(thread => {
                    return thread.subject == req.body.subject
                })){
                    page.threads.push({subject: req.body.subject, lastActivity: Date.now(), comments: []});
                    page.save();
                }
                return res.redirect(`/talk/${req.params.talkpageid}`);
            }
        });
    } else {
        return res.send("Tried to add a thread to a talkpage using an invalid talkpage ID");
    }
});
router.put("/threadsubject/:talkpageid/:threadindex", isLoggedIn, (req, res) => {
    if(req.params.talkpageid.match(/^[0-9a-fA-F]{24}$/)){
        Talkpage.findById(req.params.talkpageid, (err, talkpage) => {
            if(err){
                console.error(err);
                return res.send(`Error finding talkpage at id ${req.params.talkpageid}: ${err}`);
            } else if(!talkpage){
                return res.send(`No talkpage found with id ${req.params.talkpageid}`);
            } else {
                let thread = talkpage.threads[parseInt(req.params.threadindex)];
                if(thread){
                    if(thread.subject === req.body.newSubject){
                        return res.send("No change needed");
                    } else {
                        thread.subject = req.body.newSubject;
                        talkpage.save();
                        return res.send(`Saved`);
                    }
                } else {
                    return res.send(`Didn't find a thread at index ${req.params.threadindex}`);
                }
            }
        });
    } else {
        return res.send("Tried to change a thread to a talkpage using an invalid talkpage ID");
    }
});
router.delete("/thread/:talkpageid/:threadindex", isLoggedIn, async (req, res) => {
    if(req.params.talkpageid.match(/^[0-9a-fA-F]{24}$/)){
        let threadDeletionResult;
        Talkpage.findById(req.params.talkpageid)
            .populate({
                path: "threads.comments",
                populate: {
                    path: "author",
                    select: "comments"
                }
            })
            .exec()
            .then(talkpage => {
                if(threadDeletionResult){
                    return res.send(threadDeletionResult);
                }
                else if(!talkpage){
                    return res.send(`Didn't find a talkpage with id ${req.params.talkpageid}`);            
                } else {
                    const authorsToSave = [];
                    if(!req.params.threadindex){
                        return res.send("Didn't provide a thread index");
                    }
                    const thread = talkpage.threads[parseInt(req.params.threadindex)];
                    if(!thread){
                        return res.send("Didn't find a thread at that index");
                    }
                    for(comment of thread.comments){
                        // For each comment, delete reference to it in the author's comments array. Replies are irrelevant when deleting the whole talkpage, since replies are made within a thread.
                        const userCommentsIndex = comment.author.comments.findIndex(c => String(c) === String(comment._id));
                        if(userCommentsIndex >= 0){
                            console.log(`This is comment ${userCommentsIndex} for user with id ${comment.author._id}`);
                            comment.author.comments.splice(userCommentsIndex, 1);
                            if(!authorsToSave.find(author => author._id === comment.author._id)){
                                authorsToSave.push(comment.author);
                            }
                        }
                        // Then delete the comment itself.
                        Comment.deleteOne({_id: comment._id}, err => {
                            if(err){
                                console.log(err);
                            }
                        });
                    }
                    for(author of authorsToSave){
                        author.save();
                    }
                    thread.subject = undefined;
                    thread.lastActivity = Date.now();
                    thread.comments = undefined;
                    thread.deleted = true;
                    talkpage.markModified("threads");
                    talkpage.markModified("threads.deleted");
                    talkpage.save();
                    threadDeletionResult = "success";
                    return res.send(threadDeletionResult);
                }
            })
            .catch(err => {
                console.log(err);
                threadDeletionResult = `Error finding the Talkpage with id ${req.params.talkpageid}: ${err}`;
                return res.send(threadDeletionResult);
            });
    } else {
        return res.send("");
    }
});
router.post("/comment/:talkpageid/:threadindex", isLoggedIn, (req, res) => {
    if(req.params.talkpageid.match(/^[0-9a-fA-F]{24}$/)){
        Talkpage.findById(req.params.talkpageid, (err, page) => {
            if(err){
                console.log(err);
                return res.send({});
            }
            else{
                User.findById(req.user._id, (err, user) => {
                    if(err){
                        console.log(err);
                        return res.send({});
                    }
                    else if(user){
                        Comment.create({
                            text: req.body.comment,
                            author: user._id,
                            topic: req.params.talkpageid,
                            threadIndex: req.params.threadindex
                        }, (err, comment) => {
                            if(err){
                                console.log(err);
                                return res.send({});
                            }
                            else{
                                user.comments.push(comment);
                                user.save();
                                page.threads[req.params.threadindex].comments.push(comment);
                                page.threads[req.params.threadindex].lastActivity = Date.now();
                                page.save();
                                comment.author = user;
                                return res.send(comment);
                            }
                        });
                        
                        // console.log(`Reached the post comment route successfully! User ID is ${user._id}, and talkpage ID is ${page._id}. You are inserting ${req.body.comment}`);
                    } else {
                        return res.send({});
                    }
                })
            }
        });
    } else {
        return res.send({});
    }
});
router.get("/comment/:id", (req, res) => {
    if(req.params.id.match(/^[0-9a-fA-F]{24}$/)){
        Comment.findById(req.params.id)
            .populate("topic")
            .exec((err, comment) => {
                if(err){
                    console.log(err);
                    return res.send("Error finding that comment: " + err);
                }
                else if(comment){
                    return res.redirect(`/talk/${comment.topic._id}?thread=${comment.threadIndex}&comment=${comment.topic.threads[comment.threadIndex].comments.findIndex(c => String(comment._id) == String(c))}`)
                } else {
                    return res.send("Didn't find that comment");
                }
            });
    } else {
        return res.send("The server received a request for a comment with an invalid ID");
    }
});
router.get("/commentdata/:id", (req, res) => {
    if(req.params.id.match(/^[0-9a-fA-F]{24}$/)){
        Comment.findById(req.params.id)
            .populate("author")
            .exec((err, comment) => {
                if(err){
                    console.log(err);
                    return res.send({});
                } else if(!comment){
                    return res.send({});
                } else {
                    return res.send(comment);
                }
            });
    } else {
        return res.send({});
    }
})
router.delete("/comment/:id", isLoggedIn, (req, res) => {
    if(req.params.id.match(/^[0-9a-fA-F]{24}$/)){
        Comment.findById(req.params.id)
            .populate("author")
            .populate("topic")
            .exec((err, comment) => {
            if(err){
                console.log(err);
                return res.send(`Error finding comment to delete: ${err}`);
            } else if(comment){
                if(String(comment.author._id) == String(req.user._id)){
                    let userCommentsIndex = comment.author.comments.findIndex(c => String(comment._id) == String(c));
                    let threadCommentsIndex = comment.topic.threads[comment.threadIndex].comments.findIndex(c => String(comment._id) == String(c));
                    let stringResponse = `You'll be deleting comment ${comment._id}, made by ${comment.author.username}. Index in the user's comments is ${userCommentsIndex}, and index in thread comments is ${threadCommentsIndex}`;
                    comment.author.comments.splice(userCommentsIndex, 1);
                    comment.topic.threads[comment.threadIndex].comments.splice(threadCommentsIndex, 1);
                    comment.author.markModified("comments");
                    comment.author.save();
                    comment.topic.markModified("threads");
                    comment.topic.save();
                    Comment.findByIdAndDelete(comment._id, (err, deadComment) => {
                        if(err){
                            console.log(err);
                            stringResponse = `Error deleting the comment... ${err}`;
                        } else if(deadComment){
                            stringResponse = "Success";
                        } else {
                            stringResponse = "Couldn't find a comment to delete...";
                        }
                        return res.send(stringResponse);
                    });
                }
            } else {
                return res.send("Couldn't find comment of yours to delete");
            }
        });
    } else {
        return res.send("Tried deleting a comment with an invalid ID");
    }
});
router.get("/pagedata/:talkpageid", (req, res) => {
    if(req.params.talkpageid.match(/^[0-9a-fA-F]{24}$/)){
        Talkpage.findById(req.params.talkpageid)
            .populate({
                path: "threads.comments",
                populate: { 
                    path: "author",
                    select: "username pfpLink"
                }
            })
            .exec((err, page) => {
                if(err){
                    console.log(err);
                    return res.send(err);
                } else{
                    return res.send(page);
                }
            });
    } else {
        return res.send("Tried to get data for talkpage with an invalid ID");
    }
});
router.get("/threaddata/:talkpageid/:threadindex", (req, res) => {
    if(req.params.talkpageid.match(/^[0-9a-fA-F]{24}$/)){
        Talkpage.findById(req.params.talkpageid)
            .populate({
                path: "threads.comments",
                populate: { 
                    path: "author",
                    select: "username pfpLink"
                }
            })
            .exec((err, page) => {
                if(err){
                    console.log(err);
                    return res.send(err);
                } else{
                    res.send(page.threads[req.params.threadindex]);
                }
            });
    } else {
        return res.send("The server received a request for threaddata on a talkpage with an invalid ID");
    }
});
router.get("/:id", async (req, res) => {
    if(req.params.id.match(/^[0-9a-fA-F]{24}$/)){
        Talkpage.findById(req.params.id, async (err, page) => {
            if(err){
                console.error(err);
                return res.render("errorLanding", {
                    title: "Trouble finding talkpage root",
                    errorHTML: `<h3>In case you wanted to see the problem we ran into:</h3>
                    <pre>${JSON.stringify(err, 4)}</pre>`
                });
            }
            if(page.rootType == "IssueTemplate"){
                Issue.findById(page.root, (err, issue) => {
                    if(err){
                        console.error(err);
                        return res.send(`Trouble finding talkpage: ${err}`);
                    }
                    else if(issue){
                        return renderTalkpage(req, res, page, issue.name, `/wiki/${issue._id}`);
                    } else {
                        return res.status(404).redirect("/talk/silence");
                    }
                    
                });
            }
            else if(page.rootType == "LocalIssue"){
                LocalIssue.findById(page.root)
                    .populate("template", "name")
                    .populate("location", "name")
                    .exec((err, localIssue) => {
                        if(err){
                            console.error(err);
                            return res.render("errorLanding", {
                                title: "Trouble finding talkpage root",
                                errorHTML: `<h3>In case you wanted to see the problem we ran into:</h3>
                                <pre>${JSON.stringify(err, 4)}</pre>`
                            });
                        }
                        else if(localIssue){
                            return renderTalkpage(req, res, page, `${localIssue.template.name} in ${localIssue.location.name}`, `/wiki/local/${localIssue._id}`)
                        } else {
                            return res.status(404).redirect("/talk/silence");
                        }
                    });
            }
            else if(page.rootType == "ProjectTemplate"){
                Project.findById(page.root, (err, project) => {
                    if(err){
                        console.log(err);
                        return res.render("errorLanding", {
                            title: "Trouble finding talkpage root",
                            errorHTML: `<h3>In case you wanted to see the problem we ran into:</h3>
                            <pre>${JSON.stringify(err, 4)}</pre>`
                        });
                    }
                    else if(project){
                        return renderTalkpage(req, res, page, project.name, `/project/${project._id}`);
                    } else {
                        return res.status(404).redirect("/talk/silence");
                    }
                });
            }
            else if(page.rootType == "LocalProject"){
                LocalProject.findById(page.root)
                    .populate("template", "name")
                    .populate("location", "name")
                    .exec((err, localProject) => {
                        if(err){
                            console.log(err);
                            return res.render("errorLanding", {
                                title: "Trouble finding talkpage root",
                                errorHTML: `<h3>In case you wanted to see the problem we ran into:</h3>
                                <pre>${JSON.stringify(err, 4)}</pre>`
                            });
                        }
                        else if(localProject){
                            return renderTalkpage(req, res, page, `${localProject.template.name} in ${localProject.location.name}`, `/project/local/${localProject._id}`);
                        } else {
                            return res.status(404).redirect("/talk/silence");
                        }
                    });
            }
            else if(page.rootType == "TaskTemplate"){
                Task.findById(page.root, (err, task) => {
                    if(err){
                        console.log(err);
                        return res.render("errorLanding", {
                            title: "Trouble finding talkpage root",
                            errorHTML: `<h3>In case you wanted to see the problem we ran into:</h3>
                            <pre>${JSON.stringify(err, 4)}</pre>`
                        });
                    }
                    else if(task){
                        return renderTalkpage(req, res, page, task.name, `/project/${task.project}`);
                    } else {
                        return res.status(404).redirect("/talk/silence");
                    }
                });
            }
            else if(page.rootType == "Location"){
                Location.findById(page.root, (err, location) => {
                    if(err){
                        console.log(err);
                        return res.render("errorLanding", {
                            title: "Trouble finding talkpage root",
                            errorHTML: `<h3>In case you wanted to see the problem we ran into:</h3>
                            <pre>${JSON.stringify(err, 4)}</pre>`
                        });
                    }
                    else if(location){
                        return renderTalkpage(req, res, page, location.name, `/locations/${location._id}`);
                    } else {
                        return res.status(404).redirect("/talk/silence");
                    }
                });
            }
            else {
                return res.redirect("back");
            }
        });
    } else {
        return res.redirect("/talk/silence");
    }
});

function renderTalkpage(req, res, page, title, rootLink){
    let startScript = "<script>";
    if(req.query.thread){
        startScript += `openThreadAtIndex(${req.query.thread}`;
        if(req.query.comment){
            startScript += `, ${req.query.comment}`;
        }
        startScript += ");";
    }
    startScript += "</script>";
    return res.render("talk/page", {
        title: title,
        rootLink: rootLink,
        page: page,
        startScript: startScript
    });
}

router.get("/*", (req, res) => {
    res.status(404).redirect("/talk/silence");
});
router.put("/*", (req, res) => {
    res.status(404).redirect("/talk/silence");
});
router.post("/*", (req, res) => {
    res.status(404).redirect("/talk/silence");
});
router.delete("/*", (req, res) => {
    res.status(404).redirect("/talk/silence");
});

module.exports = router;
