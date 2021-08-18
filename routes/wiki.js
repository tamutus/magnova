const	express = require('express'),
		router = express.Router(),
		Issue = require('../api/issue/issue.template'),
		Issuegraph = require("../api/issue/issue.graph"),
        Project = require("../api/project/project.template"),
        Projectgraph = require("../api/project/project.graph"),
        Talkpage = require("../api/comments/talkpage.model"),
        Patchlist = require("../api/patchlist.model"),
		User = require("../api/user/user");
const { isLoggedIn } = require("../middleware");

router.get('/', (req, res) => {
	let currentDate = new Date();
    let startDate = new Date(currentDate.setDate(currentDate.getDate() - 60)).toISOString();
    Issue.find({identificationDate: {$gte: startDate} }, (err, recentIssues) => {
		if(err){
			console.log(err);
			return res.redirect("back");
		}
		Project.find({creationDate: {$gte: startDate} }, (err, recentProjects) => {
            if(err){
                console.log(err);
                return res.redirect("back");
            }
            return res.render('wiki/landing', {
                title: "Wiki view",
                topIssues: recentIssues,
                topProjects: recentProjects
            });
        })
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
        results["issues"] = await Issue.fuzzySearch(searchTerm).catch(err => {
            console.error(err);
            return res.send("Error fuzzy searching: " + err);
        });
    }
    if(req.query.users === "true"){
        results["users"] = await User.fuzzySearch(searchTerm).catch(err => {
            console.error(err);
            return res.send("Error fuzzy searching: " + err);
        });
    }
    if(req.query.projects === "true"){
        results["projects"] = await Project.fuzzySearch(searchTerm).catch(err => {            
            console.error(err);
            return res.send("Error fuzzy searching: " + err);
        });
        // results["projects"] = results["projects"].filter(project => project.confidenceScore > 10);
    }
    Object.keys(results).forEach(key => {
        results[key] = results[key].filter(item => JSON.parse(JSON.stringify(item)).confidenceScore > 5); // https://stackoverflow.com/a/36522374 and https://stackoverflow.com/a/35038179 explain why this JSON conversion is necessary.
    });
    // console.log(results);
    return res.send(results);
});

router.get("/edits/:id", isLoggedIn, (req, res) => {
    Patchlist.findById(req.params.id)
        .populate("patches.editor", "username")
        .exec((err, patchlist) => {
            const packet = {
                message: "Success!",
                content: {}
            };
            if(err){
                console.log(err);
                packet.message = "Couldn't find the patch list";  
            }
            else {
                packet.content = patchlist;
            }
            return res.send(packet);
        });
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
        .populate({
            path: "projects",
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
            if(!issue.edits){
                Patchlist.create({root: issue._id, rootType: "IssueTemplate"}, (err, patchlist) => {
                    if(err){console.log(err);}
                    else{
                        Issue.findByIdAndUpdate(issue._id, {edits: patchlist}, {omitUndefined: true, strict: false}, (err, updatedIssue) => {
                            if(err){ console.log(err); }
                            else{ issue.edits = updatedIssue.edits; }
                        });
                    }
                });
            }
            if(!issue.version){
                Issue.findByIdAndUpdate(issue._id, {version: 0}, {omitUndefined: true, strict: false}, (err, updatedIssue) => {
                    if(err){console.log(err);}
                    else { issue.version = 0; }
                })
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
router.put("/:id", isLoggedIn, (req, res) => {
	const {name, info, image, patch, latestVersion} = req.body;
    if(name.length == 0){
        res.send("You sent in a blank name!");
    }
    Issue.findById(req.params.id)
        .populate("edits")
        .exec(async (err, issue) => {
            if(err){
                console.log(err);
            }
            else{
                let returnMessage = `Update not needed`;
                if(issue.name != name || issue.info != info || issue.image != image){
                    if(!issue.version){
                        issue.version = 0;
                        issue.markModified("version");
                    }
                    if(issue.version != latestVersion){
                        return res.send("Latest version changed while you were creating a patch. Try again now.")
                    }
                    if(!issue.edits){
                        Patchlist.create({root: issue._id, rootType: "IssueTemplate"}, (err, patchlist) => {
                            if(err){console.log(err);}
                            else{
                                issue.edits = patchlist;
                                issue.markModified("edits");
                            }
                        });
                    }
                    if(issue.info != info){
                        issue.edits.patches.push({
                            editor: req.user._id,
                            patch: patch
                        });
                        issue.edits.markModified("patches");
                        issue.edits.save();
                        
                        issue.version++;
                        issue.markModified("version");
                        issue.info = info;
                    }
                    
                    if(!issue.editors){
                        issue.editors = [];
                        issue.markModified("editors");
                    }
                    if(!issue.editors.find(e => String(e) == String(req.user._id))){
                        issue.editors.push(req.user._id);
                        issue.markModified("editors");
                    }

                    issue.name = name;
                    issue.image = image;

                    issue.save();
                    returnMessage = `Update successful!`;
                }
                return res.send(returnMessage);
            }
        });
})

module.exports = router;