// Route handling for the planner tool.
// The planner will have different views,
//      Action | Topics | People | Gifts
//      |
//      '''V''''''''''V'''''''''V
//     Checklist    Board   Calendar
// allowing users to:
//  Organize their tasks in sortable lists, kanbans, forcegraphs, calendars etc (subroutes of activities, default can be saved)
//  Create content boards to quickly navigate to issues, projects
//  Make custom shopping lists
//  Find people you would vibe with, or who are volunteering a particular skillset

const { route } = require('.');
const { isLoggedIn } = require("../middleware");

const express = require('express'),
		router = express.Router();

// copied code below to use as example
// Mongoose model imports
// const 	User = require('../api/user/user'),
// 		Issue = require('../api/issue/issue.template'),
// 		Issuegraph = require("../api/issue/issue.graph"),
//         LocalIssue = require("../api/issue/issue.local"),
//         Project = require("../api/project/project.template"),
//         Projectgraph = require("../api/project/project.graph"),
//         Taskgraph = require("../api/task/task.graph"),
//         Harm = require("../api/issue/harm.model"),
//         Resource = require("../api/resources/resource.model"),
//         Tag = require("../api/tags/tag.model"),
//         Talkpage = require("../api/comments/talkpage.model"),
//         Location = require("../api/maps/location.model");

// router.post("/", isLoggedIn, (req, res) => {
// 	const newIssue = req.body.issue;
// 	newIssue.identifier = req.user._id;
//     newIssue.path = encodeURIComponent(newIssue.name);
//     if(newIssue.image === ""){
//         delete newIssue.image;
//     }
// 	Issue.findOne({name: newIssue.name}, (err, existing) => {
// 		if(err){
// 			console.log(err);
// 			return res.redirect("back");
// 		}
// 		if(!existing){
// 			User.findById(req.user._id, (err, user) => {
// 				if(err){
// 					console.log(err);
// 					return res.redirect("back");
// 				}
//                 else{
//                     Issue.create(newIssue, async (err, issue)=>{
//                         if(err){
//                             console.log(err);
//                             return res.redirect("back");
//                         }
//                         else {
//                             user.issues.push(issue._id);
//                             await user.save();
//                             Issuegraph.create({root: issue._id, rootType: "Issue"}, (err, issuegraph) => {
//                                 if(err){
//                                     console.log(err);
//                                 }
//                                 else{
//                                     issue.issues = issuegraph._id;
//                                     Projectgraph.create({ root: issue._id, rootType: "IssueTemplate"}, (err, projectgraph) => {
//                                         if(err) {
//                                             console.log(`Trouble creating projectgraph for an issue: ${err}`);
//                                         }
//                                         else {
//                                             issue.projects = projectgraph._id;
//                                             Talkpage.create({root: issue._id, rootType: "IssueTemplate"}, (err, talkpage) => {
//                                                 if(err){
//                                                     console.log(`Trouble creating talkpage for issue: ${err}`);
//                                                 }
//                                                 else{
//                                                     issue.talkpage = talkpage._id;
//                                                     issue.save();
//                                                     return res.redirect(`/wiki/${issue._id}`);
//                                                 }
//                                             });   
//                                         }
//                                     });
//                                 }
//                             });
//                         }
//                     });
//                 }
// 			});
// 		}
// 		else{ return res.redirect("back");}
// 	});
// });

module.exports = router;