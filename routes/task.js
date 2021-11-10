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
const taskTemplate = require("../api/task/task.template");

router.put("/:id", isLoggedIn, async (req, res) => {
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

module.exports = router;