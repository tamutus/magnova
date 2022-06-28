// External dependencies
const   express = require('express'),
        router  = express.Router();

// Models
const User = require('../api/user/user');

// Local imports
const { ROLES } = require("../roles");

router.get("/all", (req, res) => {
    const userQuery = User.find({});
    if(!(req.user?.roles?.includes(ROLES.Delegator))){
        userQuery.select("-email");
    }
    userQuery.exec((err, allUsers) => {
        if(err){
            console.log(err);
            res.redirect("back");
        }
        res.render("users/all", {
            title: "Magnova User List",
            allUsers: allUsers
        });
    });
})
router.get("/nobody", (req, res) => {
    res.render("users/nobody", {
        title: "Magnova — No such user found!"
    });
});
router.get("/unpopulated/:name", (req, res) => {
    const name = req.params.name;
    const userQuery = User.findOne({username: name});
    if(!(req.user?.username === name)){
        userQuery.select("-email");
    }
    userQuery.exec((err, user) => {
        if(err){
            console.log(err);
            res.status(404).end();
        }
        if(user && user.edgeVotes){
            res.send(user);
        }
        else{
            res.status(404).end();
        }
    });
});
router.get("/:name", (req, res) => {
    const name = req.params.name;
    const userQuery = User.findOne({username: req.params.name})
        .populate("issues")
        .populate("projects")
        .populate({
            path: "comments",
            populate: {
                path: "topic"
            }
        });
    if(!(req.user?.username === name)){
        userQuery.select("-email");
    }
    userQuery.exec((err, user) => {
        if(err){
            console.log(err);
            res.status(404).redirect("/users/nobody");
        }
        if(user){
            res.render("users/viewUser", {
                title: `${user.username}'s Profile`,
                shownUser: user
            });
        }
        else{
            res.status(404).redirect("/users/nobody");
        }
    });
});
router.get("/*", (req, res) => {
    res.status(404).redirect("/users/nobody");
});
router.put("/*", (req, res) => {
    res.status(404).redirect("/users/nobody");
});
router.post("/*", (req, res) => {
    res.status(404).redirect("/users/nobody");
});
router.delete("/*", (req, res) => {
    res.status(404).redirect("/users/nobody");
});
module.exports = router;