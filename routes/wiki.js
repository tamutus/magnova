const	express = require('express'),
		router = express.Router(),
		Issue = require('../api/issue/issue.template'),
		Issuegraph = require("../api/issue/issue.graph"),
        Projectgraph = require("../api/project/project.graph"),
        Talkpage = require("../api/comments/talkpage.model"),
		User = require("../api/user/user");

router.get('/', (req, res) => {
	let currentDate = new Date();
    let weekAgo = new Date(currentDate.setDate(currentDate.getDate() - 7)).toISOString();
    Issue.find({identificationDate: {$gte: weekAgo} }, (err, recentIssues) => {
		if(err){
			console.log(err);
			res.redirect("back");
		}
		res.render('wiki/landing', {
			title: "Wiki view",
			topIssues: recentIssues
		});
	});
});

// Useful for creating an index for a given model. 
router.get("/createIndex", async (req, res) => {
    User.find({}, async (err, users) => {
        if(err){console.log(err)}else {
            for(user of users){
                if(err){console.log(err)}else{
                    const username = user.username;
                    user.username = username;
                    console.log(username);
                    user.markModified("username");
                    await user.save();
                    // await Issue.findByIdAndUpdate(issue._id, {name: name}, {strict: false});
                }
            }
        }
    });
    return res.send("done");
});

router.get("/search", async (req, res) => {
    let searchTerm = "";
    let results = {};
    if(req.query.target){
        searchTerm = decodeURIComponent(req.query.target.replace(/\+/g, ' '));
    }
    if(req.query.issues === "true"){
        results["issues"] = [];
        await Issue.fuzzySearch(searchTerm, (err, issues)=> {
            if(err){
                console.log(err);
                return res.send("Error fuzzy searching: " + err);
            } else {
                results["issues"] = issues;
            }
        });
    }
    if(req.query.users === "true"){
        results["users"] = [];
        await User.fuzzySearch(searchTerm, (err, users)=> {
            if(err){
                console.log(err);
                return res.send("Error fuzzy searching: " + err);
            } else {
                results["users"] = users;
            }
        });
    }
    return res.send(results);
});

// To do: check whether req.params.id is mongoose objectid by this method, https://stackoverflow.com/a/29231016/6096923 , and if it's not look up at the path. refactor to have stable paths.
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
                    else {
                        let idToAdd;
                        if(person){
                            idToAdd = person._id;
                        } else {
                            idToAdd = "6064d749949511722c878e26";
                        }
                        Issue.findByIdAndUpdate(issue._id, {identifier: idToAdd}, {strict: false}, (err, updatedIssue) => {
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