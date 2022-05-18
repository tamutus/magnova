// Routes related to issues and issue mapping.

const { route } = require('.');
const { isLoggedIn } = require("../middleware");

const express = require('express'),
		router = express.Router();

// Mongoose model imports
const 	User = require('../api/user/user'),
		Issue = require('../api/issue/issue.template'),
		Issuegraph = require("../api/issue/issue.graph"),
        LocalIssue = require("../api/issue/issue.local"),
        Project = require("../api/project/project.template"),
        Projectgraph = require("../api/project/project.graph"),
        Taskgraph = require("../api/task/task.graph"),
        Harm = require("../api/issue/harm.model"),
        Resource = require("../api/resources/resource.model"),
        Tag = require("../api/tags/tag.model"),
        Talkpage = require("../api/comments/talkpage.model"),
        Location = require("../api/maps/location.model");

router.post("/", isLoggedIn, (req, res) => {
	const newIssue = req.body.issue;
	newIssue.identifier = req.user._id;
    newIssue.path = encodeURIComponent(newIssue.name);
    if(newIssue.image === ""){
        delete newIssue.image;
    }
	Issue.findOne({name: newIssue.name}, (err, existing) => {
		if(err){
			console.log(err);
			return res.redirect("back");
		}
		if(!existing){
			User.findById(req.user._id, (err, user) => {
				if(err){
					console.log(err);
					return res.redirect("back");
				}
                else{
                    Issue.create(newIssue, async (err, issue)=>{
                        if(err){
                            console.log(err);
                            return res.redirect("back");
                        }
                        else {
                            user.issues.push(issue._id);
                            await user.save();
                            Issuegraph.create({root: issue._id, rootType: "Issue"}, (err, issuegraph) => {
                                if(err){
                                    console.log(err);
                                }
                                else{
                                    issue.issues = issuegraph._id;
                                    Projectgraph.create({ root: issue._id, rootType: "IssueTemplate"}, (err, projectgraph) => {
                                        if(err) {
                                            console.log(`Trouble creating projectgraph for an issue: ${err}`);
                                        }
                                        else {
                                            issue.projects = projectgraph._id;
                                            Talkpage.create({root: issue._id, rootType: "IssueTemplate"}, (err, talkpage) => {
                                                if(err){
                                                    console.log(`Trouble creating talkpage for issue: ${err}`);
                                                }
                                                else{
                                                    issue.talkpage = talkpage._id;
                                                    issue.save();
                                                    return res.redirect(`/wiki/${issue._id}`);
                                                }
                                            });   
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
			});
		}
		else{ return res.redirect("back");}
	});
});
router.get("/localize/:id", (req, res) => { // isLoggedIn,
	if(req.params.id.match(/^[0-9a-fA-F]{24}$/)){
        Issue.findById(req.params.id)
            .populate({
                path: "instances",
                select: "location"
            })
            .exec((err, issue) => {
                if(err){
                    console.log(err);
                } else if(issue){
                    return res.render("wiki/localize", {
                        title: `Localizing ${issue.name} on Magnova`,
                        issue: issue
                    })
                } else {
                    return res.status(404).redirect("/wiki/nothing");
                }
            });
    } else {
        return res.status(404).redirect("/wiki/nothing");
    }
});
router.post("/localize/:issueid/:locationid", isLoggedIn, (req, res) => {
    if(req.params.issueid.match(/^[0-9a-fA-F]{24}$/) && req.params.locationid.match(/^[0-9a-fA-F]{24}$/)){
        LocalIssue.findOne({template: req.params.issueid, location: req.params.locationid}, (err, existing) => {
            if(err){
                console.log(err);
                return res.send({
                    message: `Error testing whether there was an existing Local Issue: ${err}`
                });
            } else if(existing) {
                return res.send({
                    message: "exists",
                    localURL: `/wiki/local/${existing._id}`
                });
            } else {
                User.findById(req.user._id, (err, user) => {
                    if(err){
                        console.log(err);
                        return res.send({
                            message: `Error finding the logged in user's profile: ${err}`
                        });
                    } else if(user){
                        Issue.findById(req.params.issueid)
                            .populate("issues")
                            .populate("projects")
                            .exec((err, issue) => {
                                if(err){
                                    console.log(err);
                                    return res.send({
                                        message: `Error finding an issue with ID ${req.params.issueid}: ${err}`
                                    });
                                } else if(!issue){
                                    return res.status(404).send({
                                        message: `Didn't find an issue with ID ${req.params.issueid}`
                                    });
                                } else {
                                    Location.findById(req.params.locationid, (err, location) => {
                                        if(err){
                                            console.log(err);
                                            return res.send({
                                                message: `Error finding an location with ID ${req.params.locationid}: ${err}`
                                            });
                                        } else if(!location){
                                            return res.send({
                                                message: `Found ${issue.name}, but didn't find a location with id ${req.params.locationid}`
                                            });
                                        } else {
                                            // Following properties must be set now: template, image, location, localizer, talkpage;
                                            let newLocalIssue = {
                                                template: issue._id,
                                                image: issue.image,
                                                location: location._id,
                                                localizer: user._id,
                                            }
                                            // return res.send(newLocalIssue);
                                            LocalIssue.create(newLocalIssue, (err, localIssue) => {
                                                if(err){
                                                    console.log(err);
                                                    return res.send({
                                                        message: `Error creating new local issue: ${err}`
                                                    });
                                                } else {
                                                    // Put references to this local issue in its issue template, the location, and the user.
                                                    if(!issue.instances){
                                                        issue.instances = [];
                                                        issue.markModified("instances");
                                                    }
                                                    issue.instances.push(localIssue._id);
                                                    issue.save();
                                                    
                                                    if(!location.issues){
                                                        location.issues = [];
                                                        location.markModified("issues");
                                                    }
                                                    location.issues.push(localIssue._id);
                                                    location.save();

                                                    if(!user.contributions){
                                                        user.contributions = {
                                                            issues: [], projects: [], tasks: []
                                                        };
                                                        user.markModified("contributions");
                                                    }
                                                    if(!user.contributions.issues){
                                                        user.contributions.issues = [];
                                                        user.markModified("contributions.issues");
                                                    }
                                                    user.contributions.issues.push({
                                                        issue: localIssue._id,
                                                        hours: 0
                                                    });
                                                    user.save();
                                                    
                                                    //Create talkpage (edits at edit route)
                                                    Talkpage.create({root: localIssue._id, rootType: "LocalIssue"}, (err, talkpage) => {
                                                        if(err){
                                                            console.log(`Trouble creating talkpage for local issue: ${err}`);
                                                            // TO DO: report this bug
                                                        }
                                                        else{
                                                            localIssue.talkpage = talkpage._id;
                                                            localIssue.save();
                                                            return res.send({
                                                                message: "success",
                                                                localURL: `/wiki/local/${localIssue._id}`
                                                            });
                                                        }
                                                    });   
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                    } else {
                        return res.send({
                            message: "Even though you're logged in, we couldn't find your profile. This is a bug."
                        })
                        // TO DO: log this bug
                    }
                
                });
            }
        });
    } else {
        return res.send("Reached the route");
    }
});
// router.delete("/resetlinks", async (req, res) => {
// 	await Issuegraph.find({}, (err, graphs) => {
// 		if(err){
// 			console.log(err);
// 			return res.send(err);
// 		}
// 		for(let graph of graphs){
// 			graph.edges = [];
// 			graph.save();
// 		}
// 		console.log(graphs);
// 	});
// 	User.find({}, (err, users) => {
// 		if(err){
// 			console.log(err);
// 			return res.send(err);
// 		}
// 		for(let user of users){
// 			user.edgeVotes = [];
// 			user.save();
// 		}
// 		console.log(users);
// 		res.send("Done");
// 	});
// });
// router.put("/updateissuegraphs", async (req, res) => {
//     require('mongoose').model('Issuegraph').schema.add({rootType: String});
//     await Issuegraph.find({}, async (err, issuegraphs) => {
//         if(err){
//             console.log(err);
//             return res.send("Error finding all issuegraphs to update: " + err);
//         }
//         for(let issuegraph of issuegraphs){
//             if(!issuegraph.rootType){ 
//                 issuegraph.rootType = "Issue"; 
//                 await issuegraph.save();
//             }
//             console.log(issuegraph.rootType);
//         }
//     });
// });
router.put("/link/:rootid/:targetid", isLoggedIn, async (req, res) => {
	// First, make sure the ids are valid
    if(req.params.rootid.match(/^[0-9a-fA-F]{24}$/) && req.params.targetid.match(/^[0-9a-fA-F]{24}$/)){
        // Then, check if they're the same
        if(req.params.rootid === req.params.targetid){
            return res.send("Those are the same issue!");
        }
        // Make sure the issues are in the database.
        Issue.findById(req.params.rootid)
            .populate("issues")
            .exec(async (err, rootFound) => {
                if(err){
                    console.log("On upvote request, mongoose error with finding root issue: " + err);
                    return res.send(err);
                }
                if(!rootFound){
                    console.log(`User tried upvoting from ${req.params.rootid}, which wasn't able to be found`)
                    return res.send("Can't find a root issue with the given id.");
                }
                else {
                    // Create an issuegraph if there is none already
                    if(!rootFound.issues){
                        Issuegraph.create({ root: rootFound._id, rootType: "Issue" }, async (err, issuegraph) => {
                            if (err) {
                                console.log("On upvote request, issue had no issuegraph and there was an error creating a new one:" + err);
                                return res.send(err);
                            }
                            else {
                                rootFound.issues = issuegraph;
                                await rootFound.save(); // Save returns a promise, so the containing function is async and I use await here.
                            }
                        });
                    }
                    Issue.findById(req.params.targetid)
                        .exec((err, targetFound) => {
                            if(err){
                                console.log(`On upvote request, mongoose error with finding target issue with id ${req.params.targetid}: ${err}`);
                                return res.send(err)
                            }
                            if(!targetFound){
                                console.log("On upvote request, couldn't find issue with id " + req.params.targetid);
                                return res.send("Can't find a target issue with the given id . Weird...");
                            }
                            else {
                                User.findById(req.user._id)
                                    .exec(async (err, currentUser) => {
                                        if(err){
                                            console.log(err);
                                        } else {
                                            // Keep track of whether a vote exists, or is in a false (downvote) state, while navigating the edgeVotes array:
                                            let scoreChange = 0;
                                            // If for some reason the edgevotes array is missing, add it
                                            if(!currentUser.edgeVotes){
                                                currentUser.edgeVotes = [];
                                                await currentUser.save();
                                            }
                                            // Because edgeVotes are pushed but unsorted, they will always be listed in the order they were added, making the index a deterministic variable for queries.
                                            let sourceIndex = currentUser.edgeVotes.findIndex(vote => {
                                                return String(vote.source) == String(rootFound._id);
                                            });
                                            // // Error checking - each user's edgeVotes array should have one object for each source issue
                                            // if(sourceIndex > -1){
                                            // 	console.log("somebody has a source duplicated in their edgevotes when there should only be one for each issue");
                                            // }
                                            // If no votes from source exist, push and save a new edgeVote object with a new nested array that has one entry: an edge to the target issue in question.
                                            if(sourceIndex === -1){
                                                scoreChange = 1;
                                                currentUser.edgeVotes.push({
                                                    source: rootFound._id,
                                                    targets: [{
                                                        target: targetFound._id,
                                                        vote: true
                                                    }]
                                                });
                                                await currentUser.save();
                                            }
                                            // Logic for when the user has at least one vote from the source issue in question, and thus a "targets" array
                                            else{
                                                // Get an index for links to the target in the targets array
                                                let targetIndex = currentUser.edgeVotes[sourceIndex].targets.findIndex(vote => {
                                                    return String(vote.target) == String(targetFound._id);
                                                });
                                                if(targetIndex === -1){
                                                    // No votes to the target from the given source exist, so add one and save.
                                                    scoreChange = 1;
                                                    currentUser.edgeVotes[sourceIndex].targets.push({
                                                        target: targetFound._id,
                                                        vote: true
                                                    });
                                                    await currentUser.save();
                                                }
                                                else{
                                                    // A vote has been found, but it could be true (an upvote) or false (a downvote).
                                                    if(currentUser.edgeVotes[sourceIndex].targets[targetIndex].vote === true){
                                                        // The vote is already in an upvote state. Do nothing but return, so the force graph code in the client's browser can visualize a link.
                                                        return res.send("You have upvoted this before.")
                                                    }
                                                    else {
                                                        // The vote is in a downvote state. Change it to upvote, save, and add TWO to the edge score.
                                                        currentUser.edgeVotes[sourceIndex].targets[targetIndex].vote = true;
                                                        currentUser.save();
                                                        scoreChange = 2;
                                                    }
                                                }
                                            }
                                            // If needed, change the value of the edge in the issue's issuegraph
                                            if(scoreChange > 0){
                                                Issuegraph.findById(rootFound.issues._id, (err, rootGraph) => {
                                                    if(err){
                                                        console.log(err);
                                                        return res.send("Couldn't find the issuegraph");
                                                    }
                                                    else{
                                                        let found = false;
                                                        for(let edge of rootGraph.edges){
                                                            if(String(edge.vertex) == String(targetFound._id)){
                                                                found = true;
                                                                edge.score += scoreChange;
                                                                for(let i = rootGraph.edges.findIndex(e => String(e._id) == String(edge._id)) -1; i >= 0; i--){
                                                                    if(edge.score > rootGraph.edges[i].score){
                                                                        [ rootGraph.edges[i], rootGraph.edges[i+1] ] = [ rootGraph.edges[i+1], rootGraph.edges[i] ];
                                                                    }
                                                                    else {
                                                                        break;
                                                                    }
                                                                }
                                                                rootGraph.markModified("edges"); // CRITICAL!!! https://stackoverflow.com/questions/35733647/mongoose-instance-save-not-working
                                                                rootGraph.save();
                                                                break;
                                                            }
                                                        }
                                                        if(!found){
                                                            rootGraph.edges.push({
                                                                score: scoreChange,
                                                                vertex: targetFound._id
                                                            });
                                                            rootGraph.markModified("edges"); // CRITICAL!!! 
                                                            rootGraph.save();
                                                        }
                                                    }
                                                });
                                            }
                                            // console.log(`${rootFound} has the following edges: ${rootFound.issues.edges}`);
                                            return res.send("Transmission of upvote complete.");
                                        }
                                    });
                            }
                        });
                }
            });
    } else {
        return res.send("Either the root or target issue's ID was invalid");
    }
});
router.delete("/link/:rootid/:targetid", isLoggedIn, async (req, res) => {
	// Mostly same logic as in PUT route above, with numbers inverted
    // First, make sure the ids are valid
    if(req.params.rootid.match(/^[0-9a-fA-F]{24}$/) && req.params.targetid.match(/^[0-9a-fA-F]{24}$/)){
        // Make sure the issues are in the database.
        Issue.findById(req.params.rootid)
            .populate("issues")
            .exec(async (err, rootFound) => {
                if(err){
                    console.log("On downvote request, mongoose error with finding root issue: " + err);
                    return res.send(err);
                }
                if(!rootFound){
                    console.log(`User tried downvoting from ${req.params.rootid}, which wasn't able to be found`)
                    return res.send("Can't find a root issue with the given id.");
                }
                else {
                    // Create an issuegraph if there is none already
                    if(!rootFound.issues){
                        Issuegraph.create({ root: rootFound._id, rootType: "Issue" }, async (err, issuegraph) => {
                            if (err) {
                                console.log("On upvote request, issue had no issuegraph and there was an error creating a new one:" + err);
                                return res.send(err);
                            }
                            else {
                                rootFound.issues = issuegraph;
                                await rootFound.save(); // Save returns a promise, so make sure to make the containing function async and use await here.
                            }
                        });
                    }
                    Issue.findById(req.params.targetid)
                        .exec((err, targetFound) => {
                            if(err){
                                console.log(`On upvote request, mongoose error with finding target issue with id ${req.params.targetid}: ${err}`);
                                return res.send(err)
                            }
                            if(!targetFound){
                                console.log("On upvote request, couldn't find issue with id " + req.params.targetid);
                                return res.send("Can't find a target issue with the given id . Weird...");
                            }
                            else {
                                User.findById(req.user._id)
                                    .exec(async (err, currentUser) => {
                                        if(err){
                                            console.log(err);
                                        } else {
                                            // Keep track of whether a vote exists, or is in a false (downvote) state, while navigating the edgeVotes array:
                                            let scoreChange = 0;
                                            // If for some reason the edgevotes array is missing, add it
                                            if(!currentUser.edgeVotes){
                                                currentUser.edgeVotes = [];
                                                await currentUser.save();
                                            }
                                            // Because edgeVotes are pushed but unsorted, they will always be listed in the order they were added, making the index a deterministic variable for queries.
                                            let sourceIndex = currentUser.edgeVotes.findIndex(vote => {
                                                return String(vote.source) == String(rootFound._id);
                                            });
                                            // // Error checking - each user's edgeVotes array should have one object for each source issue
                                            // if(sourceIndex > -1){
                                            // 	console.log("somebody has a source duplicated in their edgevotes when there should only be one for each issue");
                                            // }
                                            // If no votes from source exist, push and save a new edgeVote object with a new nested array that has one entry: an edge to the target issue in question.
                                            if(sourceIndex === -1){
                                                scoreChange = -1;
                                                currentUser.edgeVotes.push({
                                                    source: rootFound._id,
                                                    targets: [{
                                                        target: targetFound._id,
                                                        vote: false
                                                    }]
                                                });
                                                await currentUser.save();
                                            }
                                            // Logic for when the user has at least one vote from the source issue in question, and thus a "targets" array
                                            else{
                                                // Get an index for links to the target in the targets array
                                                let targetIndex = currentUser.edgeVotes[sourceIndex].targets.findIndex(vote => {
                                                    return String(vote.target) == String(targetFound._id);
                                                });
                                                if(targetIndex === -1){
                                                    // No votes to the target from the given source exist, so add one and save.
                                                    scoreChange = -1;
                                                    currentUser.edgeVotes[sourceIndex].targets.push({
                                                        target: targetFound._id,
                                                        vote: false
                                                    });
                                                    await currentUser.save();
                                                }
                                                else{
                                                    // A vote has been found, but it could be true (an upvote) or false (a downvote).
                                                    if(currentUser.edgeVotes[sourceIndex].targets[targetIndex].vote === false){
                                                        // The vote is already in a downvote state. Do nothing but return, so the force graph code in the client's browser can visualize a link.
                                                        return res.send("You have downvoted this before.")
                                                    }
                                                    else {
                                                        // The vote is in a upvote state. Change it to downvote, save, and subtract TWO from the edge score.
                                                        currentUser.edgeVotes[sourceIndex].targets[targetIndex].vote = false;
                                                        scoreChange = -2;
                                                        await currentUser.save();
                                                    }
                                                }
                                            }
                                            // If needed, change the value of the edge in the issue's issuegraph
                                            if(scoreChange < 0){
                                                
                                                // let found = false;
                                                // for(let edgeIndex = 0; edgeIndex < rootFound.issues.edges.length; edgeIndex++){
                                                //     let edge = rootFound.issues.edges[edgeIndex];
                                                //     found = String(edge.vertex) == String(targetFound._id);
                                                //     if(found){
                                                //         console.log("found the edge...");
                                                //         console.log(`edge score is ${edge.score }...`);
                                                //         rootFound.issues.edges[edgeIndex].score += scoreChange;
                                                //         console.log(`Now it's ${edge.score}`);
                                                //         let startIndex = rootFound.issues.edges.findIndex(e => String(e._id) == String(edge._id));
                                                //         console.log("starting at " + startIndex);
                                                //         for(let i = startIndex + 1; i < rootFound.issues.edges.length; i++){
                                                //             if(edge.score < rootFound.issues.edges[i].score){
                                                //                 [ rootFound.issues.edges[i], rootFound.issues.edges[i-1] ] = [ rootFound.issues.edges[i-1], rootFound.issues.edges[i] ];
                                                //             }
                                                //             else {
                                                //                 break;
                                                //             }
                                                //         }
                                                //         await rootFound.issues.save();
                                                //         await rootFound.save();
                                                //         console.log("saved (?)");
                                                //         break;
                                                //     }
                                                    
                                                // }
                                                // if(!found){
                                                //     rootFound.issues.edges.push({
                                                //         score: scoreChange,
                                                //         vertex: targetFound._id
                                                //     });
                                                //     await rootFound.issues.save();
                                                //     await rootFound.save();
                                                // }
                                                
                                                Issuegraph.findById(rootFound.issues._id, async (err, rootGraph) => {
                                                    if(err){
                                                        console.log(err);
                                                        return res.send("Couldn't find the issuegraph");
                                                    }
                                                    else{
                                                        let found = false;
                                                        for(let edge of rootGraph.edges){
                                                            if(String(edge.vertex) == String(req.params.targetid)){
                                                                found = true;
                                                                edge.score += scoreChange;
                                                                let startIndex = rootGraph.edges.findIndex(e => String(e._id) == String(edge._id));
                                                                for(let i = startIndex + 1; i < rootGraph.edges.length; i++){
                                                                    if(edge.score < rootGraph.edges[i].score){
                                                                        [ rootGraph.edges[i], rootGraph.edges[i-1] ] = [ rootGraph.edges[i-1], rootGraph.edges[i] ];
                                                                    }
                                                                    else {
                                                                        break;
                                                                    }
                                                                }
                                                                rootGraph.markModified("edges");
                                                                await rootGraph.save();
                                                                break;
                                                            }
                                                        }
                                                        if(!found){
                                                            rootGraph.edges.push({
                                                                score: scoreChange,
                                                                vertex: targetFound._id
                                                            });
                                                            rootGraph.markModified("edges");
                                                            await rootGraph.save();
                                                        }
                                                    }
                                                });

                                            }
                                            // console.log(`${rootFound} has the following edges: ${rootFound.issues.edges}`);
                                            return res.send("Transmission of downvote complete.");
                                        }
                                    });
                            }
                        });
                }
            });
    } else {
        return res.send("Either the root or target issue's ID was invalid");
    }
});

// router.get("/delete/:id", isLoggedIn, async (req, res) => {
// 	// MUST DELETE ALL REFERENCES EVERYWHERE? 
// 	await Issue.deleteOne({_id: req.params.id}, (err) => {
// 		if(err){
// 			console.log(err);
// 		}
// 	})
// 	res.redirect("/wiki");
// });

router.get("/all", (req, res) => {
    Issue.find({}, (err, allIssues) => {
		if(err){
			console.log(err);
			res.redirect("back");
		}
		res.send(allIssues);
	});
});

router.get("/toplinks/:number/:id/", async (req, res) => {
	if(req.params.id.match(/^[0-9a-fA-F]{24}$/)){
        const topResults = [];
        const limit = parseInt(req.params.number);
        // Array to store user's downvotes so they can be skipped
        const blocks = [];
        if(!limit){
            return res.send("Didn't send a proper limit to the API. The format for the top links API is /issue/toplinks/:number/:sourceID .");
        }
        if(req.user){
            User.findById(req.user._id, (err, user) => {
                if(err){
                    console.error(err);
                    return res.send(`Problem finding the user you were logged in as: ${err}`);
                } else if(user){
                    const userVotesFromSource = user.edgeVotes.find(votes => {
                        return votes.source == req.params.id;
                    });
                    for(let i = 0; userVotesFromSource && topResults.length < limit && i < userVotesFromSource.targets.length; i++){
                        if(userVotesFromSource.targets[i].vote){
                            topResults.push({
                                vertex: userVotesFromSource.targets[i].target
                            });
                        } else {
                            blocks.push(userVotesFromSource.targets[i].target);
                        }
                    }
                } else {
                    return res.send("For some reason your user ID didn't turn up a user.");
                }
            });
        }
        if(topResults.length == limit){
            return res.send(topResults);
        }
        Issue.findById(req.params.id)
            .populate({
                path: "issues",
                populate: { path: "edges" }
            })
            .exec((err, issue)=> {
                if(err){
                    console.log(err);
                    return res.send("Error finding the issue you were trying to get top links for: " + err);
                }
                // console.log("GET/toplinks for issue" + issue);
                for(let i = 0; topResults.length < limit && i < issue.issues.edges.length; i++){
                    const edge = issue.issues.edges[i];
                    if(!blocks.some(
                        e => String(e) === String(edge.vertex)
                    )){
                        let userVoteIndex = topResults.findIndex(e => {
                            return String(e.vertex) === String(edge.vertex);
                        });
                        if(userVoteIndex === -1){
                            topResults.push(edge);
                        } else {    
                            topResults[userVoteIndex] = edge;
                        }
                    }
                }
                return res.send(topResults);
            });
    } else {
        return res.send("Tried to get the top links from an issue with an invalid ID");
    }
});

router.get("/topprojects/:number/:id/", async (req, res) => {
    if(req.params.id.match(/^[0-9a-fA-F]{24}$/)){
        const topResults = [];
        const limit = parseInt(req.params.number);
        const blocks = [];
        if(!limit){
            return res.send("Didn't send a proper limit to the API. The format for the top links API is /toplinks/:number/:sourceID .");
        }
        if(req.user){
            User.findById(req.user._id, (err, user) => {
                if(err){
                    console.error(err);
                    return res.send(`Problem finding the user you were logged in as: ${err}`);
                } else if(user){
                    const userVotesFromSource = user.projectVotes.find(votes => {
                        return votes.issue == req.params.id;
                    });
                    for(let i = 0; userVotesFromSource && topResults.length < limit && i < userVotesFromSource.targets.length; i++){
                        if(userVotesFromSource.targets[i].vote){
                            topResults.push({
                                vertex: userVotesFromSource.targets[i].project
                            });
                        } else {
                            console.log(userVotesFromSource.targets[i].project)
                            blocks.push(userVotesFromSource.targets[i].project);
                        }
                    }
                    if(topResults.length == limit){
                        return res.send(topResults);
                    }
                } else {
                    return res.send("For some reason your user ID didn't turn up a user.");
                }
            });
        }
        Issue.findById(req.params.id)
            .populate({
                path: "projects",
                populate: { path: "edges" }
            })
            .exec((err, issue)=> {
                if(err){
                    console.log(err);
                    return res.send(`Problem finding the issue you were trying to populate: ${err}`);
                }
                // console.log("GET/topprojects for " + issue);
                for(let i = 0; topResults.length < limit && i < issue.projects.edges.length; i++){
                    const edge = issue.projects.edges[i];
                    
                    if(!blocks.some(
                        e => String(e) === String(edge.vertex)
                    )){
                        let userVoteIndex = topResults.findIndex(e => {
                            return String(e.vertex) === String(edge.vertex);
                        });
                        if(userVoteIndex === -1){
                            topResults.push(edge);
                        } else {    
                            topResults[userVoteIndex] = edge;
                        }
                    }                
                }
                return res.send(topResults);
            });
    } else {
        return res.send("Tried to get the top links from an issue with an invalid ID");
    }
});
router.get("/local/data/:id", async (req, res) => {
	if(req.params.id.match(/^[0-9a-fA-F]{24}$/)){
        LocalIssue.findById(req.params.id)
            .populate({
                path: "template",
                select: "name"
            })
            .populate({
                path: "location",
                select: "name"
            })
            .populate("localizer", "username")
            .populate("editors", "username")
            .populate("resources.form")
            .populate("harms.form")
            .exec((err, localIssue) => {
                if(err){
                    console.log(`Error while loading data for issue ${req.params.id}: ${err}`);
                }
                return res.send(localIssue);
            });
    } else {
        return res.send(`Tried getting a Local Issue using an invalid ID of ${req.params.id}`);
    }
})
router.get("/data/:id", async (req, res) => {
	if(req.params.id.match(/^[0-9a-fA-F]{24}$/)){
        Issue.findById(req.params.id)
            .populate({
                path: "issues",
                populate: { 
                    path: "edges",
                    populate: {
                        path: "vertex"
                    }
                }
            })
            .populate({
                path: "projects",
                populate: { 
                    path: "edges",
                    populate: {
                        path: "vertex"
                    }
                }
            })
            .populate({
                path: "instances",
                populate: {
                    path: "location",
                    select: "name"
                }
            })
            .populate("identifier", "username")
            .exec((err, issue) => {
                if(err){
                    console.log(`Error while loading data for issue ${req.params.id}: ${err}`);
                }
                return res.send(issue);
            });
    } else {
        return res.send("Tried getting an issue using an invalid ID");
    }
})
// If anything messes up with an issuegraph's score, you can rebuild those scores with this function, which queries all users for their edgevotes and corrects all issues' issuegraphs.
// Not deployed because it will become a server-intensive task that regular users shouldn't be performing.
// router.get("/updatelinks", async (req, res) => {
//     let allVotes = {};
//     await User.find({}, async (err, users) => {
//         if(err){
//             console.log(`Trouble finding all users: ${err}`);
//             return res.send("Couldn't find users");
//         }
//         else{
//             for(let user of users){
//                 for(let edgeSet of user.edgeVotes){
//                     let sourceVotes = allVotes[edgeSet.source];
//                     if(!sourceVotes){
//                         allVotes[edgeSet.source] = {};
//                     }
//                     for(let edge of edgeSet.targets){
//                         let scoreChange = edge.vote ? 1 : -1 ;
//                         if(!allVotes[edgeSet.source][edge.target]){
//                             allVotes[edgeSet.source][edge.target] = 0;
//                         }
//                         allVotes[edgeSet.source][edge.target] += scoreChange;
//                     }
//                 }
//             }
//         }
//     });
//     Issue.find({})
//         .populate("issues")
//         .exec(async(err, foundIssues) => {
//             if(err){
//                 console.log(`Error finding issues: ${err}`);
//             }
//             else{
//                 let changed = [];
//                 for(let issue of foundIssues){
//                     for(let edge of issue.issues.edges){
//                         let scoreChange = allVotes[issue._id][edge.vertex] - edge.score;
//                         if(scoreChange != 0){
//                             console.log(`Need to change score from ${issue.name} to ${edge.vertex} by ${scoreChange}`);
//                             edge.score += scoreChange;
//                             issue.issues.markModified("edges");
//                             await issue.issues.save();
//                             changed.push(issue.name);
//                         }
//                     }
//                 }
//                 if(changed.length > 0){
//                     console.log("Changed scores of links from ");
//                     for(let i = 0; i < changed.length - 1; i++){
//                         console.log(`${changed[i]}, `);
//                     }
//                     console.log(`and ${changed[changed.length - 1]}.`)
//                 }
//                 else{
//                     console.log("nothing had to be changed!");
//                 }
//             }
//         });
// });


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

// Need sub-edit routes for mods, which do verification of role:
// https://developerhandbook.com/passport.js/passport-role-based-authorisation-authentication/

module.exports = router;