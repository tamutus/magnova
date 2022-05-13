const express = require('express'),
		router = express.Router();

// Mongoose model imports
const 	User = require('../api/user/user');

// Local imports
const { isLoggedIn } = require("../middleware");

router.get("/", (req, res) => {
    if(req.user && String(req.user._id).match(/^[0-9a-fA-F]{24}$/)){
        User.findOne({_id: req.user._id}, (err, user) => {
            if(err){
                console.error(err);
                res.status(404).redirect("/users/nobody");
            }
            else if (!user){
                return res.send(`Couldn't find the user profile that you're logged in as: ${err}`);
            }
            else {
                return res.render("users/settings", {
                    title: `${user.preferredName?.length > 0 ? user.preferredName : user.username}'s Settings`,
                    shownUser: user
                })
            }
        });
    }
    else {
        return res.redirect("/auth/login");
    }
})
router.put("/change-password", isLoggedIn, (req, res) => {
    if(String(req.user._id).match(/^[0-9a-fA-F]{24}$/)){
        User.findById(req.user._id, (err, user) => {
            if(err){
                console.error(err);
                return res.send({
                    userMessage: 'Error trying to load your user profile.  Weird. <a href="/wiki/61154178c1aa0c00156455b9">Submit a bug?</a>',
                    devMessage: err
                });
            }
            else if(!user){
                return res.send({
                    userMessage: `We couldn't seem to find your user profile. Weird. <a href="/wiki/61154178c1aa0c00156455b9">Submit a bug?</a>`
                })
            } 
            else {
                user.changePassword(req.body.oldPassword, req.body.newPassword, (err, u) => {
                    if (err) {
                        return res.send({
                            userMessage: 'Error trying to set your new password',
                            devMessage: err
                        });
                    }
                    else {
                        res.status(200);
                        return res.send({
                            userMessage: "Successfully changed password"
                        });
                    }
                });
            }
        });
    } else {
        return res.send({
            userMessage: `Somehow the webpage didn't send the server your right ID. <a href="/wiki/61154178c1aa0c00156455b9">Submit a bug?</a>`,
            devMessage: `The server received a request for a user with an improper req.user._id: ${req.user._id}.`
        });
    }
});
module.exports = router;