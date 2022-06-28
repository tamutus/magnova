const	express = require('express'),
		router = express.Router(),
		Issue = require('../api/issue/issue.template'),
		Issuegraph = require("../api/issue/issue.graph"),
        LocalIssue = require("../api/issue/issue.local"),
        Project = require("../api/project/project.template"),
        Projectgraph = require("../api/project/project.graph"),
        Location = require("../api/maps/location.model"),
        Talkpage = require("../api/comments/talkpage.model"),
        Patchlist = require("../api/patchlist.model"),
		User = require("../api/user/user");
const { isLoggedIn, authorizeByRoles } = require("../middleware");

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

router.get("/nothing", (req, res) => {
    return res.render("wiki/nothing", {
        title: "Magnova - the 404 page"
    });
});

// Useful for creating an index for a given model. 
// router.get("/createIndex", async (req, res) => {
//     User.find({}, async (err, users) => {
//         if(err){console.log(err)}else {
//             for(let user of users){
//                 if(err){console.log(err)}else{
//                     const username = user.username;
//                     user.username = username;
//                     console.log(username);
//                     user.markModified("username");
//                     await user.save();
//                     // await Issue.findByIdAndUpdate(issue._id, {name: name}, {strict: false});
//                 }
//             }
//         }
//     });
//     return res.send("done");
// });

// To reset the edits
// router.delete("/reset_edits", (req, res) => {
//     Patchlist.updateMany({}, {patches: []}, (err, patchlists) => {
//         if(err){
//             return res.send(err);
//         } else {
//             return res.send(patchlists);
//         }
//     });
//     Issue.updateMany({}, {version: 0});
//     LocalIssue.updateMany({}, {version: 0});
//     Project.updateMany({}, {version: 0});
//     Location.updateMany({}, {version: 0});
// });


// Refactor to not send all location info? or refactor to add a d3 rendering of the shape
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
        for(const user of results["users"]){
            user["email"] = undefined;
        }
    }
    if(req.query.projects === "true"){
        results["projects"] = await Project.fuzzySearch(searchTerm).catch(err => {            
            console.error(err);
            return res.send("Error fuzzy searching: " + err);
        });
    }
    if(req.query.locations === "true"){
        results["locations"] = await Location.fuzzySearch(searchTerm).catch(err => {            
            console.error(err);
            return res.send("Error fuzzy searching: " + err);
        });
        
        // results["projects"] = results["projects"].filter(project => project.confidenceScore > 10);
    }
    Object.keys(results).forEach(key => {
        results[key] = results[key].filter(item => JSON.parse(JSON.stringify(item)).confidenceScore > (Math.min(5, searchTerm.length))); // https://stackoverflow.com/a/36522374 and https://stackoverflow.com/a/35038179 explain why this JSON conversion is necessary.
    });

    if(req.query.locations === "true"){
        let trimmedLocations = [];
        for(let locationIndex = 0; locationIndex < results.locations.length; locationIndex++){
            let fullLocation = results.locations[locationIndex],
                trimmedLocation = {
                    name: fullLocation.name,
                    _id: fullLocation._id,
                    confidenceScore: JSON.parse(JSON.stringify(fullLocation)).confidenceScore,
                    info: fullLocation.info
                };
            if(fullLocation.superlocation){
                await Location.findById(fullLocation.superlocation, (err, parent) => {
                    if(err){
                        console.log(err);
                        return res.send(`Error loading ${fullLocation.name}'s superlocation (id: ${fullLocation.superlocation})`);
                    } else if(parent) {
                        trimmedLocation.superlocation = {
                            name: parent.name,
                            _id: parent._id
                        };
                    }
                });
            }
            trimmedLocations.push(trimmedLocation);
        }
        results.locations = trimmedLocations;
    }
    return res.send(results);
});

router.get("/edits/:id", isLoggedIn, (req, res) => {
    if(req.params.id.match(/^[0-9a-fA-F]{24}$/)){
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
    } else {
        return res.send({
            message: "The server received a request for a patchlist with an improper id.",
            content: {}
        });
    }
});

router.get("/all", (req, res) => {
    Issue.find({}, (err, issues) => {
        if(err){
            console.log(err);
            res.send(`Erorr finding all issues: ${err}`);
        } else {
            res.render("wiki/allissues", {
                title: "All Issues on Magnova",
                issues: issues
            });
        }
    });
});

router.put("/local/:id", authorizeByRoles("Editor"), (req, res) => {
    if(!req.params.id.match(/^[0-9a-fA-F]{24}$/)){
        return res.send(`The server received a PUT request for a Local Issue with an improper ID: ${req.params.id}`);
    }
    const {info, image, patch, latestVersion} = req.body;
    LocalIssue.findById(req.params.id)
        .populate("edits")
        .exec(async (err, localIssue) => {
            if(err){
                console.log(err);
                return res.send(`Error trying to find that Local Issue: ${err}`);
            }
            else if(!localIssue){
                return res.send(`Didn't find a Local Issue with ID ${req.params.id}`);
            }
            else {
                let returnMessage = "Update ";
                if(localIssue.localInfo != info || localIssue.image != image){
                    if(!localIssue.version){
                        localIssue.version = 0;
                        localIssue.markModified("version");
                    }
                    if(localIssue.version != latestVersion){
                        return res.send("Latest version changed while you were creating a patch. Try again now.");
                    }
                    if(!localIssue.edits){
                        Patchlist.create({root: localIssue._id, rootType: "LocalIssue"}, (err, patchlist) => {
                            if(err){
                                console.log(err);
                                return res.send("No patch list for edits, and an error creating a new one: " + err);
                            }
                            else{
                                localIssue.edits = patchlist;
                                localIssue.markModified("edits");
                            }
                        });
                    }
                    if(localIssue.localInfo != info){
                        returnMessage += "to this Local Issue's info, ";
                        localIssue.edits.patches.push({
                            editor: req.user._id,
                            patch: patch
                        });
                        localIssue.edits.markModified("patches");
                        localIssue.edits.save();
                        
                        localIssue.version++;
                        localIssue.markModified("version");
                        localIssue.localInfo = info;
                    }
                    
                    if(!localIssue.editors){
                        localIssue.editors = [];
                        localIssue.markModified("editors");
                    }
                    if(!localIssue.editors.find(e => String(e) == String(req.user._id))){
                        localIssue.editors.push(req.user._id);
                        localIssue.markModified("editors");
                    }
                    if(localIssue.image != image){
                        returnMessage += "to this Local Issue's image, ";
                        localIssue.image = image;
                    }

                    returnMessage += "Successful!";
                    localIssue.save();
                } else {
                    returnMessage += "not needed.";
                }
                return res.send(returnMessage);
            }
        });
});

router.get("/local/:id", (req, res) => {
    if(req.params.id.match(/^[0-9a-fA-F]{24}$/)){
        LocalIssue.findById(req.params.id)
            // Populate its own fields,
            .populate("localizer", "username")
            .populate("location")
            .populate("editors", "username")
            .populate("resources.form")
            .populate("harms.form")
            // and populate some of its template's fields
            // .populate("template")
            .populate({
                path: "template",
                populate: {
                    path: "projects",
                    populate: {
                        path: "edges.vertex",
                        select: "name tasks implementations",
                        populate: {
                            path: "implementations",
                            select: "location"
                        }
                        // populate: {
                        //     path: "tasks",
                        //     populate: {
                        //         path: "edges.vertex",
                        //         select: "name"
                        //     }
                        // }
                    }
                }
            })
            .exec((err, instance) => {
                if(err){
                    console.log(err);
                    return res.status(404).redirect("/wiki/nothing");
                } else if(!instance){
                    return res.status(404).redirect("/wiki/nothing");
                } else {
                    instance.template.projects.edges = instance.template.projects.edges.filter(edge => edge.score > 0);
                    instance.localProjects = [];
                    for(let edge of instance.template.projects.edges){
                        let localProject = edge.vertex.implementations.find(implementation => implementation.location === instance.location._id);
                        if(localProject){
                            instance.localProjects.push(localProject);
                        }
                    }
                    if(!instance.edits){
                        Patchlist.create({root: instance._id, rootType: "LocalIssue"}, (err, patchlist) => {
                            if(err){console.log(err);}
                            else{
                                LocalIssue.findByIdAndUpdate(instance._id, {edits: patchlist}, {omitUndefined: true, strict: false}, (err, updatedLocalIssue) => {
                                    if(err){ console.log(err); }
                                    else{ instance.edits = updatedLocalIssue.edits; }
                                });
                            }
                        });
                    }
                    return res.render("wiki/viewLocal", {
                        title: `${instance.template.name} in ${instance.location.name}`,
                        localIssue: instance
                    });
                }
            });
    } else {
        return res.status(404).redirect("/wiki/nothing");
    }    
});

// Check whether req.params.id is mongoose objectid by this method, https://stackoverflow.com/a/29231016/6096923 , and if it's not look up at the path. refactor to have stable paths.
router.get('/:id', (req, res) => {
	if(req.params.id.match(/^[0-9a-fA-F]{24}$/)){
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
            .populate("resources.form")
            .populate({
                path: "instances",
                populate: {
                    path: "location",
                    select: "name"
                }
            })
            .populate({
                path: "projects",
                populate: { path: "edges.vertex" }
            })
            .exec((err, issue) => {
                if(err){
                    console.log(err);
                    return res.redirect("back");
                }
                else if(!issue){
                    return res.status(404).redirect("/wiki/nowhere");
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
                    });
                }
                if(issue.creator || issue.creationDate){
                    Issue.findByIdAndUpdate(issue._id, {creator: undefined, creationDate: undefined}, {omitUndefined: true, strict: false}, (err, updatedIssue) => {
                        if(err){console.log(err);}
                    });
                }
                if(!issue.instances){
                    Issue.findByIdAndUpdate(issue._id, {instances: []}, {omitUndefined: true, strict: false}, (err, updatedIssue) => {
                        if(err){console.log(err);}
                        else { issue.instances = []; }
                    });
                }
                return res.render("wiki/view", {
                    title: `${issue.name} - Magnova Wiki`,
                    issue: issue
                });
            });
    } else {
        return res.status(404).redirect("/wiki/nothing");
    }
});
router.put("/:id", authorizeByRoles("Editor"), (req, res) => {
	if(!req.params.id.match(/^[0-9a-fA-F]{24}$/)){
        return res.status(400).send("The server received a PUT request for an issue with an improper ID");
    }
    const {name, info, image, patch, latestVersion} = req.body;
    if(name.length == 0){
        return res.send("You sent in a blank name!");
    }
    Issue.findById(req.params.id)
        .populate("edits")
        .exec(async (err, issue) => {
            if(err){
                console.log(err);
            }
            else if(!issue){
                return res.send(`Didn't find an Issue with ID ${req.params.id}`);
            }
            else{
                let returnMessage = "Update ";
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
                            if(err){
                                console.log(err);
                                return res.send("No patch list for edits, and an error creating a new one: " + err);
                            }
                            else{
                                issue.edits = patchlist;
                                issue.markModified("edits");
                            }
                        });
                    }
                    if(issue.info != info){
                        returnMessage += "to this issue's info, ";
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

                    if(issue.name != name){
                        returnMessage += "to this issue's name, ";
                        issue.name = name;
                    }
                    if(issue.image != image){
                        returnMessage += "to this issue's image, ";
                        issue.image = image;
                    }

                    returnMessage += "Successful!";
                    issue.save();
                } else {
                    returnMessage += "not needed.";
                }
                return res.send(returnMessage);
            }
        });
});

router.get("/*", (req, res) => {
    res.status(404).redirect("/wiki/nothing");
});
router.put("/*", (req, res) => {
    res.status(404).redirect("/wiki/nothing");
});
router.post("/*", (req, res) => {
    res.status(404).redirect("/wiki/nothing");
});
router.delete("/*", (req, res) => {
    res.status(404).redirect("/wiki/nothing");
});

module.exports = router;