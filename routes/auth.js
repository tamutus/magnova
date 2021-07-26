const User = require('../api/user/user');
const { isLoggedIn } = require("../middleware");

const express  = require('express'),
	  router   = express.Router(),
      passport = require("passport");

function usernameToLowerCase(req, res, next){
    req.body.username = req.body.username.toLowerCase();
    next();
}
router.get("/usernametaken/:name", (req, res) => {
    User.find({username: req.params.name.toLowerCase()}, (err, user) => {
        if(err){
            console.log(err);
        }
        else if(user.length > 0){
            res.send(true);
        }
        else{
            res.send(false);
        }
    });
});
router.get("/emailtaken/:email", (req, res) => {
    User.find({email: req.params.email.toLowerCase()}, (err, user) => {
        if(err){
            console.log(err);
        }
        else if(user.length > 0){
            res.send(true);
        }
        else{
            res.send(false);
        }
    });
});
router.get("/login", (req, res) => {
    res.render("auth/login", {
        title: "Magnova — Log in",
        referer: req.headers.referer
    });
});
router.post("/login", usernameToLowerCase, passport.authenticate("local", {failureRedirect: "/auth/login"}), (req, res) => {
    if (req.body.referer && (req.body.referer !== undefined && req.body.referer.slice(-11) !== "/auth/login" && req.body.referer.slice(-14) !== "/auth/register")) {
        res.redirect(req.body.referer);
    }
    else{
        res.redirect("/nexus");
    }
    // res.redirect(req.session.returnTo || '/nexus');     //this variable, req.sesson.returnTo, is captured for every visited page in app.js middleware
})
router.get("/loggedin", (req, res) => {
    res.render("auth/loggedin", {
        title: "Magnova Login Successful"
    })
});
router.get("/logout", (req, res) => {
    req.logout();
    res.redirect("back");
});
router.get("/register", (req, res) => {
    res.render("auth/register", {
        title: "Magnova User Registration"
    });
});
router.get("/my_data", (req, res) => {
    User.findById(req.user._id, (err, user) => {
        if(err){
            res.send(`Couldn't find your data... ${err}`);
        }
        else {
            res.send(user);
        }
    });
    
});
router.put("/my_data", async (req, res) => {
    const {preferredName, email, bio, pfpLink} = req.body;
    // if(username.length == 0){
    //     res.send("You sent in a blank username!");
    // }
    User.findById(req.user._id, async (err, user) => {
        if(err){
            console.log(err);
        }
        // else if(req.user.username != username){
        //     User.find({username: username}, (err, otherUser) => {
        //         if (otherUser.length > 0){
        //             res.send("Sorry, that username has been taken");
        //         }
        //     });
        // }
        else{
            // user.username = username; implementing username changes will require some modification of the middleware for serializing users
            user.preferredName = preferredName;
            user.bio = bio;
            user.email = email;
            user.pfpLink = pfpLink;
            user.save();
            let returnMessage = `Update successful!`;
            console.log(returnMessage);
            res.send(returnMessage);
        }
    });
});
router.post("/register", async (req, res) => {
    const {username, password, email} = req.body;
    if(username.length > 30){
        return res.send("Sorry, that username is way too long. 40 characters max.");
    }
    lowercaseUsername = username.slice(0).toLowerCase();
    lowercaseEmail = email.slice(0).toLowerCase();
    User.findOne({username: lowercaseUsername}, async (err, user) => {
        if(err){
            console.log(err);
        }
        else if(user){
            res.send("Sorry, that username has been taken");
        }
        else{
            User.find({email: lowercaseEmail}, async (err, user) => {
                if(err){
                    console.log(err);
                }
                else if(user.length > 0){
                    res.send("Sorry, that email has been taken");
                }
                else {
                    const user = new User({username: lowercaseUsername, email: lowercaseEmail});
                    const registeredUser = await User.register(user, password);
                    req.login(registeredUser, err => {
                        if(err) return next(err);
                    });
                    res.redirect(`/users/${registeredUser.username}`);
                }
            })
        }
    });
});
router.get("/delete-user/:id", isLoggedIn, async (req, res) => {
    const user = await User.findById(req.params.id);
    if(!user.equals(req.user._id)){
        console.log("Somebody tried to delete another user");
        res.redirect("back");
    }
    else{
        User.deleteOne(user, (err) => {
            if(err){
                console.log(err);
            }
            res.redirect("back");
        });
        
    }
});
module.exports = router;