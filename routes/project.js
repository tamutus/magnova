const { isLoggedIn } = require("../middleware");

const express = require('express'),
		router = express.Router();

// Mongoose model imports
const 	User = require('../api/user/user'),
		Issue = require('../api/issue/issue.template'),
        Issuegraph = require("../api/issue/issue.graph"),
        Project = require("../api/project/project.template"),
        Projectgraph = require("../api/project/project.graph"),
        Task = require("../api/task/task.template"),
        Taskgraph = require("../api/task/task.graph"),
        Harm = require("../api/issue/harm.model"),
        Resource = require("../api/resources/resource.model"),
        Tag = require("../api/tags/tag.model"),
        Talkpage = require("../api/comments/talkpage.model"),
        Location = require("../api/maps/location.model");

router.post("/", isLoggedIn, (req, res) => {
    const newProject = req.body.project;
    newProject.creator = req.user._id;
    if(newProject.image === ""){
        delete newProject.image;
    }
    Project.findOne({name: newProject.name}, (err, existing) => {
        if(err){
            console.log(err);
            return res.redirect("back");
        }
        if(!existing){
            User.findById(req.user._id, (err, user) => {
                if(err){
                    console.log(err);
                    return res.redirect("back");
                } else if(!user){
                    return res.redirect("back");
                } else {
                    Project.create(newProject, async (err, project)=>{
                        if(err){
                            console.log(err);
                            return res.redirect("back");
                        }
                        else {
                            if(!user.projects){ 
                                user.projects = [];
                            }
                            user.projects.push(project._id);
                            user.markModified("projects");
                            await user.save();
                            Issuegraph.create({root: project._id, rootType: "ProjectTemplate"}, (err, issuegraph) => {
                                if(err){
                                    console.log(err);
                                }
                                else{
                                    project.issues = issuegraph._id;
                                    Taskgraph.create({ root: project._id, rootType: "ProjectTemplate"}, (err, taskgraph) => {
                                        if(err) {
                                            console.log(`Trouble creating projectgraph for a project: ${err}`);
                                        }
                                        else {
                                            project.tasks = taskgraph._id;
                                            Talkpage.create({root: project._id, rootType: "ProjectTemplate"}, (err, talkpage) => {
                                                if(err){
                                                    console.log(`Trouble creating talkpage for project: ${err}`);
                                                }
                                                else{
                                                    project.talkpage = talkpage._id;
                                                    project.save();
                                                    return res.redirect(`/project/${project._id}`);
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

router.get("/", (req, res) => {
    Project.find({}, (err, allProjects) => {
        if(err){
            console.log(err);
            return res.redirect("back");
        } else {
            return res.render('project/landing', {
                title: "Project view",
                projects: allProjects
            });
        }
    });
});
router.get("/data/:id", async (req, res) => {
	Project.findById(req.params.id)
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
            path: "tasks", 
			populate: { 
                path: "edges",
                populate: {
                    path: "vertex"
                }
            }
        })
		.exec((err, project) => {
			if(err){
				console.log(`Error while loading data for project ${req.params.id}: ${err}`);
			}
			return res.send(project);
		});
})
router.put("/toissue/:projectid/:issueid", isLoggedIn, async (req, res) => {
    Project.findById(req.params.projectid)
        .populate("issues")
        .exec(async (err, project) => {
            if(err){
                console.log("On project-to-issue upvote request, mongoose error with finding the project to link: " + err);
                return res.send(err);
            }
            if(!project){
                console.log(`User tried linking to a project, id:${req.params.projectid}, which wasn't able to be found`)
                return res.send("Can't find a project with the given id.");
            }
            else {
                // Create an issuegraph if there is none already
                if(!project.issues){
                    Issuegraph.create({ root: project._id, rootType: "ProjectTemplate" }, async (err, issuegraph) => {
                        if (err) {
                            console.log("On upvote request, project had no issuegraph and there was an error creating a new one:" + err);
                            return res.send(err);
                        }
                        else {
                            project.issues = issuegraph;
                            project.markModified("issues");
                            await project.save(); // Save returns a promise, so the containing function is async and I use await here.
                        }
                    });
                }
                Issue.findById(req.params.issueid)
                    .populate("projects")
                    .exec((err, issue) => {
                        if(err){
                            console.log(`On upvote request, mongoose error with finding target issue with id ${req.params.issueid}: ${err}`);
                            return res.send(err)
                        }
                        if(!issue){
                            console.log("On project-to-issue upvote request, couldn't find issue with id " + req.params.issueid);
                            return res.send("Can't find a target issue with the given id. Weird...");
                        }
                        else {
                            if(!issue.projects){
                                Projectgraph.create({ root: issue._id, rootType: "IssueTemplate" }, async (err, projectgraph) => {
                                    if (err) {
                                        console.log("On upvote request, issue had no projectgraph and there was an error creating a new one:" + err);
                                        return res.send(err);
                                    }
                                    else {
                                        issue.projects = projectgraph;
                                        issue.markModified("projects");
                                        await issue.save(); // Save returns a promise, so the containing function is async and I use await here.
                                    }
                                });
                            }
                            User.findById(req.user._id)
                                .exec(async (err, currentUser) => {
                                    if(err){
                                        console.log(err);
                                    } else {
                                        // Keep track of whether a vote exists, or is in a false (downvote) state, while navigating the projectVotes array:
                                        let scoreChange = 0;
                                        // If for some reason the projectvotes array is missing, add it
                                        if(!currentUser.projectVotes){
                                            currentUser.projectVotes = [];
                                            currentUser.markModified("projectVotes");
                                            await currentUser.save();
                                        }
                                        // Because projectVotes are pushed but unsorted, they will always be listed in the order they were added, making the index a deterministic variable for queries.
                                        let sourceIndex = currentUser.projectVotes.findIndex(vote => {
                                            return String(vote.issue) == String(issue._id);
                                        });
                                        // // Error checking - each user's projectVotes array should have one object for each source issue
                                        // if(sourceIndex > -1){
                                        // 	console.log("somebody has a source duplicated in their projectVotes when there should only be one for each issue");
                                        // }
                                        // If no votes from source exist, push and save a new edgeVote object with a new nested array that has one entry: an edge to the target issue in question.
                                        if(sourceIndex === -1){
                                            scoreChange = 1;
                                            currentUser.projectVotes.push({
                                                issue: issue._id,
                                                targets: [{
                                                    project: project._id,
                                                    vote: true
                                                }]
                                            });
                                            currentUser.markModified("projectVotes");
                                            await currentUser.save();
                                        }
                                        // Logic for when the user has at least one vote from the source issue in question, and thus a "targets" array
                                        else{
                                            // Get an index for links to the target in the targets array
                                            let targetIndex = currentUser.projectVotes[sourceIndex].targets.findIndex(vote => {
                                                return String(vote.project) == String(project._id);
                                            });
                                            if(targetIndex === -1){
                                                // No votes to the target from the given source exist, so add one and save.
                                                scoreChange = 1;
                                                currentUser.projectVotes[sourceIndex].targets.push({
                                                    project: project._id,
                                                    vote: true
                                                });
                                                currentUser.markModified("projectVotes");
                                                await currentUser.save();
                                            }
                                            else{
                                                // A vote has been found, but it could be true (an upvote) or false (a downvote).
                                                if(currentUser.projectVotes[sourceIndex].targets[targetIndex].vote === true){
                                                    // The vote is already in an upvote state. Do nothing but return, so the force graph code in the client's browser can visualize a link.
                                                    return res.send("You have upvoted this before.")
                                                }
                                                else {
                                                    // The vote is in a downvote state. Change it to upvote, save, and add TWO to the edge score.
                                                    currentUser.projectVotes[sourceIndex].targets[targetIndex].vote = true;
                                                    currentUser.markModified("projectVotes");
                                                    currentUser.save();
                                                    scoreChange = 2;
                                                }
                                            }
                                        }
                                        // If needed, change the value of the edge in both the issue's projectgraph and the projects issuegraph and sort each.
                                        if(scoreChange > 0){
                                            // First, the issue's projectgraph.
                                            let projectFound = false;
                                            for(edge of issue.projects.edges){
                                                if(String(edge.vertex) == String(project._id)){
                                                    projectFound = true;
                                                    edge.score += scoreChange;
                                                    for(let i = issue.projects.edges.findIndex(e => String(e._id) == String(edge._id)) -1; i >= 0; i--){
                                                        if(edge.score > issue.projects.edges[i].score){
                                                            [ issue.projects.edges[i], issue.projects.edges[i+1] ] = [ issue.projects.edges[i+1], issue.projects.edges[i] ];
                                                        }
                                                        else {
                                                            break;
                                                        }
                                                    }
                                                    issue.projects.markModified("edges"); // CRITICAL!!! https://stackoverflow.com/questions/35733647/mongoose-instance-save-not-working
                                                    await issue.projects.save();
                                                    break;
                                                }
                                            }
                                            if(!projectFound){
                                                issue.projects.edges.push({
                                                    score: scoreChange,
                                                    vertex: project._id
                                                });
                                                issue.projects.markModified("edges"); // CRITICAL!!! 
                                                await issue.projects.save();
                                            }
                                            // Second, the project's issuegraph
                                            let issueFound = false;
                                            for(edge of project.issues.edges){
                                                if(String(edge.vertex) == String(issue._id)){
                                                    issueFound = true;
                                                    edge.score += scoreChange;
                                                    for(let i = project.issues.edges.findIndex(e => String(e._id) == String(edge._id)) -1; i >= 0; i--){
                                                        if(edge.score > project.issues.edges[i].score){
                                                            [ project.issues.edges[i], project.issues.edges[i+1] ] = [ project.issues.edges[i+1], project.issues.edges[i] ];
                                                        }
                                                        else {
                                                            break;
                                                        }
                                                    }
                                                    project.issues.markModified("edges"); // CRITICAL!!! https://stackoverflow.com/questions/35733647/mongoose-instance-save-not-working
                                                    await project.issues.save();
                                                    break;
                                                }
                                            }
                                            if(!issueFound){
                                                project.issues.edges.push({
                                                    score: scoreChange,
                                                    vertex: issue._id
                                                });
                                                project.issues.markModified("edges"); // CRITICAL!!! 
                                                await project.issues.save();
                                            }
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
router.delete("/toissue/:projectid/:issueid", isLoggedIn, async (req, res) => {
// Mostly same logic as in PUT route above, with numbers inverted
// First, make sure the issues are in the database.
    Project.findById(req.params.projectid)
        .populate("issues")
        .exec(async (err, project) => {
            if(err){
                console.log("On project-to-issue downvote request, mongoose error with finding the project to link: " + err);
                return res.send(err);
            }
            if(!project){
                console.log(`User tried downvoting a link to a project, id:${req.params.projectid}, which wasn't able to be found`)
                return res.send("Can't find a project with the given id.");
            }
            else {
                // Create an issuegraph if there is none already
                if(!project.issues){
                    Issuegraph.create({ root: project._id, rootType: "ProjectTemplate" }, async (err, issuegraph) => {
                        if (err) {
                            console.log("On upvote request, project had no issuegraph and there was an error creating a new one:" + err);
                            return res.send(err);
                        }
                        else {
                            project.issues = issuegraph;
                            project.markModified("issues");
                            await project.save(); // Save returns a promise, so make sure to make the containing function async and use await here.
                        }
                    });
                }
                Issue.findById(req.params.issueid)
                    .populate("projects")
                    .exec((err, issue) => {
                        if(err){
                            console.log(`On upvote request, mongoose error with finding target issue with id ${req.params.issueid}: ${err}`);
                            return res.send(err)
                        }
                        if(!issue){
                            console.log("On project-to-issue downvote request, couldn't find issue with id " + req.params.issueid);
                            return res.send("Can't find a target issue with the given id. Weird...");
                        }
                        else {
                            if(!issue.projects){
                                Projectgraph.create({ root: issue._id, rootType: "IssueTemplate" }, async (err, projectgraph) => {
                                    if (err) {
                                        console.log("On upvote request, issue had no projectgraph and there was an error creating a new one:" + err);
                                        return res.send(err);
                                    }
                                    else {
                                        issue.projects = projectgraph;
                                        issue.markModified("projects");
                                        await issue.save(); // Save returns a promise, so the containing function is async and I use await here.
                                    }
                                });
                            }
                            User.findById(req.user._id)
                                .exec(async (err, currentUser) => {
                                    if(err){
                                        console.log(err);
                                    } else {
                                        // Keep track of whether a vote exists, or is in a false (downvote) state, while navigating the projectVotes array:
                                        let scoreChange = 0;
                                        // If for some reason the projectVotes array is missing, add it
                                        if(!currentUser.projectVotes){
                                            currentUser.projectVotes = [];
                                            currentUser.markModified("projectVotes");
                                            await currentUser.save();
                                        }
                                        // Because projectVotes are pushed but unsorted, they will always be listed in the order they were added, making the index a deterministic variable for queries.
                                        let sourceIndex = currentUser.projectVotes.findIndex(vote => {
                                            return String(vote.issue) == String(issue._id);
                                        });
                                        // // Error checking - each user's projectVotes array should have one object for each source issue
                                        // if(sourceIndex > -1){
                                        // 	console.log("somebody has a source duplicated in their projectVotes when there should only be one for each issue");
                                        // }
                                        // If no votes from source exist, push and save a new edgeVote object with a new nested array that has one entry: an edge to the target issue in question.
                                        if(sourceIndex === -1){
                                            scoreChange = -1;
                                            currentUser.projectVotes.push({
                                                issue: issue._id,
                                                targets: [{
                                                    project: project._id,
                                                    vote: false
                                                }]
                                            });
                                            currentUser.markModified("projectVotes");
                                            await currentUser.save();
                                        }
                                        // Logic for when the user has at least one vote from the source issue in question, and thus a "targets" array
                                        else{
                                            // Get an index for links to the target in the targets array
                                            let targetIndex = currentUser.projectVotes[sourceIndex].targets.findIndex(vote => {
                                                return String(vote.project) == String(project._id);
                                            });
                                            if(targetIndex === -1){
                                                // No votes to the target from the given source exist, so add one and save.
                                                scoreChange = -1;
                                                currentUser.projectVotes[sourceIndex].targets.push({
                                                    project: project._id,
                                                    vote: false
                                                });
                                                currentUser.markModified("projectVotes");
                                                await currentUser.save();
                                            }
                                            else{
                                                // A vote has been found, but it could be true (an upvote) or false (a downvote).
                                                if(currentUser.projectVotes[sourceIndex].targets[targetIndex].vote === false){
                                                    // The vote is already in a downvote state. Do nothing but return, so the force graph code in the client's browser can visualize a link.
                                                    return res.send("You have downvoted this before.")
                                                }
                                                else {
                                                    // The vote is in a upvote state. Change it to downvote, save, and subtract TWO from the edge score.
                                                    currentUser.projectVotes[sourceIndex].targets[targetIndex].vote = false;
                                                    currentUser.markModified("projectVotes");
                                                    scoreChange = -2;
                                                    await currentUser.save();
                                                }
                                            }
                                        }
                                        // If needed, change the value of the edge in the issue's issuegraph
                                        if(scoreChange < 0){
                                            let projectFound = false;
                                            for(edge of issue.projects.edges){
                                                if(String(edge.vertex) == String(project._id)){
                                                    projectFound = true;
                                                    edge.score += scoreChange;
                                                    let startIndex = issue.projects.edges.findIndex(e => String(e._id) == String(edge._id));
                                                    for(let i = startIndex + 1; i < issue.projects.edges.length; i++){
                                                        if(edge.score < issue.projects.edges[i].score){
                                                            [ issue.projects.edges[i], issue.projects.edges[i-1] ] = [ issue.projects.edges[i-1], issue.projects.edges[i] ];
                                                        }
                                                        else {
                                                            break;
                                                        }
                                                    }
                                                    issue.projects.markModified("edges");
                                                    await issue.projects.save();
                                                    break;
                                                }
                                                if(!projectFound){
                                                    issue.projects.edges.push({
                                                        score: scoreChange,
                                                        vertex: project._id
                                                    });
                                                    issue.projects.markModified("edges");
                                                    await issue.projects.save();
                                                }
                                            }
                                            let issueFound = false;
                                            for(edge of project.issues.edges){
                                                if(String(edge.vertex) == String(issue._id)){                   // ****************
                                                    issueFound = true;
                                                    edge.score += scoreChange;
                                                    let startIndex = project.issues.edges.findIndex(e => String(e._id) == String(edge._id));
                                                        for(let i = startIndex + 1; i < project.issues.edges.length; i++){
                                                            if(edge.score < project.issues.edges[i].score){
                                                                [ project.issues.edges[i], project.issues.edges[i-1] ] = [ project.issues.edges[i-1], project.issues.edges[i] ];
                                                            }
                                                            else {
                                                                break;
                                                            }
                                                        }
                                                    project.issues.markModified("edges"); // CRITICAL!!! https://stackoverflow.com/questions/35733647/mongoose-instance-save-not-working
                                                    await project.issues.save();
                                                    break;
                                                }
                                            }
                                            if(!issueFound){
                                                project.issues.edges.push({
                                                    score: scoreChange,
                                                    vertex: issue._id
                                                });
                                                project.issues.markModified("edges"); // CRITICAL!!! 
                                                await project.issues.save();
                                            }
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


router.get("/:id", (req, res) => {
    Project.findById(req.params.id)
        .populate("creator", "username")
        .populate("designers", "username")
        .populate({
            path: "issues",
            populate: { path: "edges.vertex" }
        })
        .populate("tags")
        .populate("resources.resource")
        .populate("implementations")
        .populate({
            path: "tasks",
            populate: { path: "edges.vertex" }
        })
        .exec((err, project) => {
        if(err){
            console.log(err);
            return res.redirect("back");
        } else if(project) {
            return res.render('projects/view', {
                title: `${project.name} — A Magnova Project`,
                project: project
            });
        } else {
            return res.redirect("/project");
        }
    });
});
router.put("/:id", isLoggedIn, (req, res) => {
	const {name, info, image} = req.body;
    if(name.length == 0){
        res.send("You sent in a blank name!");
    }
    Project.findById(req.params.id, async (err, project) => {
        if(err){
            console.log(err);
        }
        else{
            // user.username = username; implementing username changes will require some modification of the middleware for serializing users
            let returnMessage = `Update not needed`;
            if(project.name != name || project.info != info || project.image != image){
                project.name = name;
                project.info = info;
                project.image = image;
                if(!project.designers){
                    project.designers = [];
                    project.markModified("designers");
                }
                if(!project.designers.find(e => String(e) == String(req.user._id))){
                    project.designers.push(req.user._id);
                    project.markModified("designers");
                }
                project.save();
                returnMessage = `Update successful!`;
            }
            res.send(returnMessage);
        }
    });
})

module.exports = router;