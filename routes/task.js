// API for working with Tasks.

const { isLoggedIn, authorizeByRoles, deleteTalkpage } = require("../middleware");

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
        LocalTask = require("../api/task/task.local"),
        Harm = require("../api/issue/harm.model"),
        Resource = require("../api/resources/resource.model"),
        Tag = require("../api/tags/tag.model"),
        Patchlist = require("../api/patchlist.model"),
        Location = require("../api/maps/location.model");


router.get("/action", isLoggedIn, (req, res) => {
    User.findById(req.user._id, (err, user) => {
        if(err){
            console.error(err);
            return res.send(`Error loading the current user: ${err}`);
        } else {
            return res.render('tasks/planner', {
                title: "Task Manager",
                currentUser: user
            });
        }
    });
});

router.get("/:id", (req, res) => {
    if(req.params.id.match(/^[0-9a-fA-F]{24}$/)){
        Task.findById(req.params.id, (err, task) => {
            if(err){
                console.log(err);
                return res.send(`Error finding that task: ${err}`);
            } else if(task){
                res.redirect(`/project/${task.project}`);
            } else{
                return res.send(`Didn't find a task with id ${req.params.id}`);
            }
        })
    } else {
        return res.send("Tried to find a task using an invalid task ID");
    }
});
router.put("/:id", authorizeByRoles("Editor"), async (req, res) => {
    if(req.params.id.match(/^[0-9a-fA-F]{24}$/)){
        const {name, info, completionRequirements} = req.body;
        if(name.length == 0){
            res.send("You sent in a blank name!");
        }
        Task.findById(req.params.id, async (err, task) => {
            if(err){
                console.log(err);
                return res.send(err);
            }
            else{
                // user.username = username; implementing username changes will require some modification of the middleware for serializing users
                let returnMessage = `Update not needed`;
                if(task.name != name || task.info != info || task.completionRequirements != completionRequirements){
                    task.name = name;
                    task.info = info;
                    task.completionRequirements = completionRequirements;
                    if(!task.designers){
                        task.designers = [];
                        task.markModified("designers");
                    }
                    if(!task.designers.find(e => String(e) == String(req.user._id))){
                        task.designers.push(req.user._id);
                        task.markModified("designers");
                    }
                    task.save();
                    returnMessage = `Update successful!`;
                }
                res.send(returnMessage);
            }
        });
    } else {
        return res.send("Tried to edit a task using an invalid task ID");
    }
});

// Deleting a task: Verify the id. Find the Task. Prevent deletion if there are substantial links, or if deleter isn't an admin/the author.
//            Find author. Find associated Project. Delete the Talkpage with all Comments. Delete task from Project's Taskgraph. Delete task from author's created Task list.
//            Only the author of a task, or a Mediator, can delete tasks.
router.delete("/:id", isLoggedIn, (req, res) => {
    if(req.params.id.match(/^[0-9a-fA-F]{24}$/)){
        Task.findById(req.params.id, (err, task) => {
            if(err){
                console.log(err);
                return res.send(`Error finding the task you wanted to delete: ${err}`);
            }
            else if(!task){
                return res.send(`Couldn't find a task with id ${req.params.id}`);
            } else {
                if(task.badge){
                    return res.send("That Task has a Badge associated with it, so it can't be deleted.");
                }
                if(task?.volunteers.length > 0){
                    return res.send("People are already volunteering for this Task, so it can't be deleted.");
                }
                if(task?.resources.length > 0){
                    return res.send("Resources are already being allocated for this Task, so it can't be deleted.");
                }
                if(task?.skills.length > 0){
                    return res.send("Skills have been associated with this Task, so it cannot be deleted");
                }
                if(task?.precursors.length > 0){
                    return res.send("This Task has precursors. Unlink them to delete it.");
                }
                if(task?.successors.length > 0){
                    return res.send("This Task has successors. Unlink them to delete it.");
                }
                if(task?.harms.length > 0){
                    return res.send("This Task has associated Harms, so it can't be deleted");
                }
                if(task?.tags.length > 0){
                    return res.send("This Task has Tags. Remove them if you would like to delete the Task.");
                }
                if(String(req.user._id) === String(task.creator) || req.user.roles?.includes("Mediator")){
                    User.findById(task.creator, (err, creator) => {
                        if(err){
                            console.log(err);
                            return res.send(`Error finding the User for the Task you wanted to delete: ${err}`);
                        } else if(!creator) {
                            return res.send(`Couldn't find a Task with id ${req.params.id}`);
                        } else {
                            Project.findById(task.project)
                                .populate("tasks")
                                .exec(async (err, project) => {
                                    if(err){
                                        console.log(err);
                                        return res.send(`Error finding the Project for this task: ${err}`);
                                    } else if(!project){
                                        return res.send("Couldn't find a Project for this task");
                                    } else {
                                        if(!project.tasks){
                                            return res.send("Found the Project but it didn't have a Taskgraph")
                                        } else {
                                            // Delete the talkpage
                                            const taskIndex = project.tasks.edges.findIndex(edge => {
                                                return String(edge.vertex) === String(task._id);
                                            });
                                            if(task.talkpage){
                                                let talkpageDeletionResult = await deleteTalkpage(task.talkpage, req);
                                                if(talkpageDeletionResult === "success"){
                                                    project.tasks.edges.splice(taskIndex, 1);
                                                    project.tasks.save();
                                                } else {
                                                    console.log(`Talkpage deletion result: ${talkpageDeletionResult}`);
                                                    return res.send(talkpageDeletionResult);
                                                }
                                            }
                                            Task.deleteOne({_id: task._id}, err => {
                                                if(err){
                                                    console.log(err);
                                                    return res.send(`Error deleting the Talkpage for this Task: ${err}`);
                                                }
                                            });
                                            // If Patchlists are added to Tasks...
                                            // Patchlist.deleteOne({id: task.edits}, err => {
                                            //     if(err){
                                            //         console.log(err);
                                            //         return res.send(`Error finding the Patchlist for this Task: ${err}`);
                                            //     }
                                            // });

                                            return res.send(`Task "${task.name}" belonging to Project ${project.name}, along with Talkpage ${task.talkpage} and its comments, have been deleted`);
                                        }
                                    }
                                });
                        }
                    });
                } else {
                    return res.send("You aren't authorized to delete this. Only a Task's author or somebody with the Mediator role can do that.");
                }
            }
        });
    } else {
        return res.send("Tried to delete a Task using an invalid task ID");
    }
});

function deleteTaskReferences(taskID){
    // talkpage
    // creator
    // edits
}


module.exports = router;