// Routes related to issues and issue mapping.

const { route } = require('.');
const { isLoggedIn } = require("../middleware");

const express = require('express'),
		router = express.Router();

// Mongoose model imports
const 	User = require('../api/user/user'),
		Issue = require('../api/issue/issue.model'),
		Issuegraph = require("../api/issuegraph/issuegraph.model");

router.post("/", isLoggedIn, (req, res) => {
	const newIssue = req.body.issue;
	newIssue.creator = req.user._id;
    newIssue.path = encodeURIComponent(newIssue.name);
    console.log(encodeURIComponent(newIssue.name));
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
				Issue.create(newIssue, async (err, issue)=>{
					if(err){
						console.log(err);
						return res.redirect("back");
					}
					user.issues.push(issue._id);
					await user.save();
					Issuegraph.create({root: issue._id}, async (err, issuegraph) => {
						if(err){
							console.log(err);
						}
						issue.issues = issuegraph._id;
						await issue.save();
						return res.redirect(`/wiki/${issue._id}`);
					});
				});
			});
		}
		return res.redirect("back");
	});
});

router.delete("/resetlinks", async (req, res) => {
	await Issuegraph.find({}, (err, graphs) => {
		if(err){
			console.log(err);
			return res.send(err);
		}
		for(graph of graphs){
			graph.edges = [];
			graph.save();
		}
		console.log(graphs);
	});
	User.find({}, (err, users) => {
		if(err){
			console.log(err);
			return res.send(err);
		}
		for(user of users){
			user.edgeVotes = [];
			user.save();
		}
		console.log(users);
		res.send("Done");
	});
});

router.put("/link/:rootid/:targetid", isLoggedIn, async (req, res) => {
	// First, make sure the issues are in the database.
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
					Issuegraph.create({ root: rootFound._id }, async (err, issuegraph) => {
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
									}
									// Keep track of whether a vote exists, or is in a false (downvote) state, while navigating the edgeVotes array:
									let scoreChange = 0;
									// If for some reason the edgevotes array is missing, add it
									if(!currentUser.edgeVotes){
										currentUser.edgeVotes = [];
										await currentUser.save();
									}
									// Because edgeVotes are pushed but unsorted, they will always be listed in the order they were added, making the index a deterministic variable for queries.
									let sourceIndex = currentUser.edgeVotes.findIndex(vote => {
										return vote.source == req.params.rootid;
									});
									// // Error checking - each user's edgeVotes array should have one object for each source issue
									// if(sourceIndex > -1){
									// 	console.log("somebody has a source duplicated in their edgevotes when there should only be one for each issue");
									// }
									// If no votes from source exist, push and save a new edgeVote object with a new nested array that has one entry: an edge to the target issue in question.
									if(sourceIndex === -1){
										scoreChange = 1;
										currentUser.edgeVotes.push({
											source: req.params.rootid,
											targets: [{
												target: req.params.targetid,
												vote: true
											}]
										});
										await currentUser.save();
									}
									// Logic for when the user has at least one vote from the source issue in question, and thus a "targets" array
									else{
										// Get an index for links to the target in the targets array
										let targetIndex = currentUser.edgeVotes[sourceIndex].targets.findIndex(vote => {
											return vote.target == req.params.targetid;
										});
										if(targetIndex === -1){
											// No votes to the target from the given source exist, so add one and save.
											scoreChange = 1;
											currentUser.edgeVotes[sourceIndex].targets.push({
												target: req.params.targetid,
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
											let found = false;
											for(edge of rootGraph.edges){
												if(edge.vertex == req.params.targetid){
													found = true;
													edge.score += scoreChange;
													for(let i = rootGraph.edges.indexOf(edge) -1; i > 0; i--){
														if(edge.score > rootGraph.edges[i].score){
															[ rootGraph.edges[i], rootGraph.edges[i+1] ] = [ rootGraph.edges[i+1], rootGraph.edges[i] ];
														}
														else {
															break;
														}
													}
													rootGraph.save();
												}
											}
											if(!found){
												rootGraph.edges.push({
													score: scoreChange,
													vertex: req.params.targetid
												});
												rootGraph.save();
											}
										});
									}
									console.log(`${rootFound} has the following edges: ${rootFound.issues.edges}`);
									return res.send("Transmission of upvote complete.");
								});
						}
					});
			}
		});
});
router.delete("/link/:rootid/:targetid", async (req, res) => {
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
					Issuegraph.create({ root: rootFound._id }, async (err, issuegraph) => {
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
									}
									// Keep track of whether a vote exists, or is in a false (downvote) state, while navigating the edgeVotes array:
									let scoreChange = 0;
									// If for some reason the edgevotes array is missing, add it
									if(!currentUser.edgeVotes){
										currentUser.edgeVotes = [];
										await currentUser.save();
									}
									// Because edgeVotes are pushed but unsorted, they will always be listed in the order they were added, making the index a deterministic variable for queries.
									let sourceIndex = currentUser.edgeVotes.findIndex(vote => {
										return vote.source == req.params.rootid;
									});
									// // Error checking - each user's edgeVotes array should have one object for each source issue
									// if(sourceIndex > -1){
									// 	console.log("somebody has a source duplicated in their edgevotes when there should only be one for each issue");
									// }
									// If no votes from source exist, push and save a new edgeVote object with a new nested array that has one entry: an edge to the target issue in question.
									if(sourceIndex === -1){
										scoreChange = -1;
										currentUser.edgeVotes.push({
											source: req.params.rootid,
											targets: [{
												target: req.params.targetid,
												vote: false
											}]
										});
										await currentUser.save();
									}
									// Logic for when the user has at least one vote from the source issue in question, and thus a "targets" array
									else{
										// Get an index for links to the target in the targets array
										let targetIndex = currentUser.edgeVotes[sourceIndex].targets.findIndex(vote => {
											return vote.target == req.params.targetid;
										});
										if(targetIndex === -1){
											// No votes to the target from the given source exist, so add one and save.
											scoreChange = -1;
											currentUser.edgeVotes[sourceIndex].targets.push({
												target: req.params.targetid,
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
												currentUser.save();
												scoreChange = -2;
											}
										}
									}
									// If needed, change the value of the edge in the issue's issuegraph
									if(scoreChange < 0){
										Issuegraph.findById(rootFound.issues._id, (err, rootGraph) => {
											let found = false;
											for(edge of rootGraph.edges){
												if(edge.vertex == req.params.targetid){
													found = true;
													edge.score += scoreChange;
													for(let i = rootGraph.edges.indexOf(edge) + 1; i < rootGraph.edges.length; i++){
														if(edge.score < rootGraph.edges[i].score){
															[ rootGraph.edges[i], rootGraph.edges[i-1] ] = [ rootGraph.edges[i-1], rootGraph.edges[i] ];
														}
														else {
															break;
														}
													}
													rootGraph.save();
												}
											}
											if(!found){
												rootGraph.edges.push({
													score: scoreChange,
													vertex: req.params.targetid
												});
												rootGraph.save();
											}
										});
									}
									console.log(`${rootFound} has the following edges: ${rootFound.issues.edges}`);
									return res.send("Transmission of downvote complete.");
								});
						}
					});
			}
		});
});

router.get("/delete/:id", isLoggedIn, async (req, res) => {
	// MUST DELETE ALL REFERENCES EVERYWHERE? 
	await Issue.deleteOne({_id: req.params.id}, (err) => {
		if(err){
			console.log(err);
		}
	})
	res.redirect("/wiki");
});

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
			console.log("GET/toplinks for issue" + issue);
			return res.send(issue.issues.edges.slice(0, req.params.number));
		});
});

router.get("/data/:id", async (req, res) => {
	Issue.findById(req.params.id)
		.populate({
			path: "issues",
			populate: { path: "edges" }
		})
		.exec((err, issue) => {
			if(err){
				console.log(`Error while loading data for issue ${req.params.id}: ${err}`);
			}
			return res.send(issue);
		});
})

// Need sub-edit routes for mods, which do verification of role:
// https://developerhandbook.com/passport.js/passport-role-based-authorisation-authentication/

module.exports = router;