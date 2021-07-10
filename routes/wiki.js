const	express = require('express'),
		router = express.Router(),
		Issue = require('../api/issue/issue.template'),
		Issuegraph = require("../api/issue/issue.graph"),
        Projectgraph = require("../api/project/project.graph"),
        Talkpage = require("../api/comments/talkpage.model"),
		User = require("../api/user/user");

router.get('/', (req, res) => {
	Issue.find({}, (err, allIssues) => {
		if(err){
			console.log(err);
			res.redirect("back");
		}
		res.render('wiki/landing', {
			title: "Wiki view",
			topIssues: allIssues
		});
	});
});

router.get('/:id', (req, res) => {
	Issue.findById(req.params.id)
		.populate("identifier", "username")
        .populate("editors", "username")
		.populate({
			path: "issues",
			populate: { path: "edges.vertex" }
		})
        .populate("tags")
        .populate("resources.resource")
		.populate("instances")
        .populate({
            path: "projects",
            populate: { path: "edges.vertex" }
        })
		.exec((err, issue) => {
			if(err){
				console.log(err);
				return res.redirect("back");
			}
			if(!issue.issues){
				Issuegraph.create({root: issue._id, rootType: "Issue"}, (err, issuegraph) => {
					if(err){
						console.log(err);
					}
                    else{
                        Issue.findByIdAndUpdate(issue._id, {issues: issuegraph._id})
                    }
				});
			}
            if(!issue.projects){
                Projectgraph.create({root: issue._id, rootType: "IssueTemplate"}, (err, projectgraph) => {
                    if(err){
                        console.log(err);
                    }
                    else{
                        Issue.findByIdAndUpdate(issue._id, {projects: projectgraph._id}, {strict: false}, (err, updatedIssue) => {
                            if(err){console.log(err)}
                            else{
                                issue.projects=updatedIssue.projects;
                            }
                        });
                    }
                });
            }
            if(!issue.talkpage){
                Talkpage.create({root: issue._id, rootType: "IssueTemplate"}, (err, talkpage) => {
                    if(err){
                        console.log(err);
                    } else{
                        Issue.findByIdAndUpdate(issue._id, {talkpage: talkpage._id}, {strict: false}, (err, updatedIssue) => {
                            if(err){ console.log(err); }
                            else{ issue.talkpage = updatedIssue.talkpage; }
                        });
                    }
                });
            }
            if(!issue.identifier){
                User.findOne({issues: issue._id}, (err, person)=> {
                    if(err){console.log(err)}
                    else{
                        Issue.findByIdAndUpdate(issue._id, {identifier: person._id}, {strict: false}, (err, updatedIssue) => {
                            if(err) {console.log(err); }
                            else{ issue.identifier = updatedIssue.identifier }
                        });
                    }
                });
            }
            if(issue.creator || issue.creationDate){
                Issue.findByIdAndUpdate(issue._id, {creator: undefined, creationDate: undefined}, {omitUndefined: true, strict: false}, (err, updatedIssue) => {
                    if(err){console.log(err);}
                });
            }
			return res.render("wiki/view", {
				title: `${issue.name} - Magnova Wiki`,
				issue: issue
			});
		});
});
router.put("/:id", (req, res) => {
	const {name, info, image} = req.body;
    // if(username.length == 0){
    //     res.send("You sent in a blank username!");
    // }
    Issue.findById(req.params.id, async (err, issue) => {
        if(err){
            console.log(err);
        }
        else{
            // user.username = username; implementing username changes will require some modification of the middleware for serializing users
            let returnMessage = `Update not needed`;
            if(issue.name != name || issue.info != info || issue.image != image){
                issue.name = name;
                issue.info = info;
                issue.image = image;
                if(!issue.editors){
                    issue.editors = [];
                }
                if(!issue.editors.find(e => String(e) == String(req.user._id))){
                    issue.editors.push(req.user._id);
                }
                issue.save();
                returnMessage = `Update successful!`;
            }
            res.send(returnMessage);
        }
    });
})
module.exports = router;