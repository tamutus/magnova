// Routes related to issues and issue mapping.

const { route } = require('.');
const { isLoggedIn } = require("../middleware");

const express = require('express'),
		router = express.Router();

// Mongoose model imports
const 	User = require('../api/user/user'),
		Issue = require('../api/issue/issue.template'),
		Issuegraph = require("../api/issue/issue.graph"),
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

// router.delete("/resetlinks", async (req, res) => {
// 	await Issuegraph.find({}, (err, graphs) => {
// 		if(err){
// 			console.log(err);
// 			return res.send(err);
// 		}
// 		for(graph of graphs){
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
// 		for(user of users){
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
//         for(issuegraph of issuegraphs){
//             if(!issuegraph.rootType){ 
//                 issuegraph.rootType = "Issue"; 
//                 await issuegraph.save();
//             }
//             console.log(issuegraph.rootType);
//         }
//     });
// });
router.put("/link/:rootid/:targetid", isLoggedIn, async (req, res) => {
	// First, make sure the issues are in the database.
	if(req.params.rootid === req.params.targetid){
        return res.send("Those are the same issue!");
    }
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
                                                    for(edge of rootGraph.edges){
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
});
router.delete("/link/:rootid/:targetid", isLoggedIn, async (req, res) => {
	// Mostly same logic as in PUT route above, with numbers inverted
	// First, make sure the issues are in the database.
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
                                                    for(edge of rootGraph.edges){
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

// Modify this to synthesize the user's edgevotes with popular connections.
router.get("/toplinks/:number/:id/", async (req, res) => {
	Issue.findById(req.params.id)
		.populate({
			path: "issues",
			populate: { path: "edges" }
		})
		.exec((err, issue)=> {
			if(err){
				console.log(err);
			}
			// console.log("GET/toplinks for issue" + issue);
			return res.send(issue.issues.edges.slice(0, req.params.number));
		});
});

router.get("/data/:id", async (req, res) => {
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
        .populate("identifier", "username")
		.exec((err, issue) => {
			if(err){
				console.log(`Error while loading data for issue ${req.params.id}: ${err}`);
			}
			return res.send(issue);
		});
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
//             for(user of users){
//                 for(edgeSet of user.edgeVotes){
//                     let sourceVotes = allVotes[edgeSet.source];
//                     if(!sourceVotes){
//                         allVotes[edgeSet.source] = {};
//                     }
//                     for(edge of edgeSet.targets){
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
//                 for(issue of foundIssues){
//                     for(edge of issue.issues.edges){
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


// Need sub-edit routes for mods, which do verification of role:
// https://developerhandbook.com/passport.js/passport-role-based-authorisation-authentication/

module.exports = router;