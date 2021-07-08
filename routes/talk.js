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
		User = require("../api/user/user");

const { isLoggedIn } = require("../middleware");
        
router.post("/newthread/:talkpageid", isLoggedIn, async (req, res) => {
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
});
router.post("/comment/:talkpageid/:threadindex", isLoggedIn, (req, res) => {
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
                else{
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
                            res.send(comment);
                        }
                    });
                    
                    // console.log(`Reached the post comment route successfully! User ID is ${user._id}, and talkpage ID is ${page._id}. You are inserting ${req.body.comment}`);
                }
            })
        }
    });
});
router.delete("/comment/:id", (req, res) => {
    Comment.findById(req.params.id, (err))
});
router.get("/thread/:talkpageid/:threadindex", (req, res) => {
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
    
});
router.get("/:id", async (req, res) => {
    Talkpage.findById(req.params.id, async (err, page) => {
        if(err){
            console.log(err);
            return res.send(`Trouble finding talkpage: ${err}`);
        }
        let title = "",
            rootLink = "";
        if(page.rootType == "IssueTemplate"){
            await Issue.findById(page.root, (err, issue) => {
                if(err){
                    console.log(err);
                    return res.send(`Trouble finding talkpage: ${err}`);
                }
                else{
                    title = issue.name;
                    rootLink = `/wiki/${issue._id}`;
                    return res.render("talk/page", {
                        title: title,
                        rootLink: rootLink,
                        page: page
                    });
                }
            });
        }
        else if(page.rootType == "ProjectTemplate"){
            await Project.findById(page.root, (err, project) => {
                if(err){
                    console.log(err);
                    return res.send(`Trouble finding talkpage: ${err}`);
                }
                else{
                    title = project.name;
                    rootLink = `/wiki/project/${project._id}`;
                    return res.render("talk/page", {
                        title: title,
                        rootLink: rootLink,
                        page: page
                    });
                }
            });
        }
        else {
            res.redirect("back");
        }
    });
});

module.exports = router;
