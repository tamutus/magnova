const User = require('../api/user/user');

const express = require('express'),
		router = express.Router();

router.get("/all", (req, res) => {
    User.find({}, (err, allUsers) => {
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
    User.findOne({username: req.params.name})
        .exec((err, user) => {
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
    User.findOne({username: req.params.name})
        .populate("issues")
        .populate("comments")
        .exec((err, user) => {
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

module.exports = router;