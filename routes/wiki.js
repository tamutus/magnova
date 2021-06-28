const	express = require('express'),
		router = express.Router(),
		Issue = require('../api/issue/issue.model'),
		Issuegraph = require("../api/issuegraph/issuegraph.model"),
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
		.populate("creator", "username")
		.populate({
			path: "issues",
			populate: { path: "edges.vertex" }
		})
		.populate("projects")
		.populate("tasks")
		.exec((err, issue) => {
			if(err){
				console.log(err);
				return res.redirect("back");
			}
			if(!issue.issues){
				Issuegraph.create({root: issue._id}, (err, issuegraph) => {
					if(err){
						console.log(err);
					}
					issue.issues = issuegraph._id;
					issue.save();
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
            issue.name = name;
            issue.info = info;
            issue.image = image;
            issue.save();
            let returnMessage = `Update successful!`;
            console.log(returnMessage);
            res.send(returnMessage);
        }
    });
})

module.exports = router;