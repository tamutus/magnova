// Models
const   User  = require('../api/user/user'),
        Token = require('../api/user/token');

// Local imports
const   { isLoggedIn, reportAddress } = require("../middleware"),
        { expectEnv, smtpTransport }  = require("../util");

// Library imports
const express       = require('express'),
	  router        = express.Router(),
      passport      = require("passport"),
      crypto        = require("crypto"),
      bcrypt        = require("bcrypt"),
      { waterfall } = require("async"),
      bcryptSalt    = expectEnv("BCRYPT_SALT");

function usernameToLowerCase(req, res, next){
    req.body.username = req.body.username.toLowerCase();
    next();
}
const invalidKeyErrorPage = {
    title: "Difficulties Resetting Password",
    errorHTML: 
        `<h2>That key doesn't work</h2>
        <h4>After you request a password reset, we generate a "token" as a temporary key to your account. That token expires one hour after it was generated.</h4>
        <ol>
            <li>If you created yours over an hour ago, please go back and submit a new request.</li>
            <li>Double check the URL with what we sent in the email.</li>
            <li>Reach out to ${reportAddress} if you're still having problems.</li>
        </ol>
        <h4><a href="/auth/forgot-password">Send a new password reset request</a></h4>`
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
    if (req.body.referer && (req.body.referer.slice(-11) !== "/auth/login" && req.body.referer.slice(-14) !== "/auth/register")) {
        res.redirect(req.body.referer);
    }
    else{
        res.redirect("/");
    }
    // res.redirect(req.session.returnTo || '/nexus');     //this variable, req.sesson.returnTo, is captured for every visited page in app.js middleware
})
router.get("/forgot-password", (req, res) => {
    return res.render("auth/forgotPassword", {
        title: "Forgot Magnova Password"
    });
})
router.post("/forgot-password", usernameToLowerCase, (req, res, next) => {
    waterfall([
        function(done) {
            crypto.randomBytes(20, function(err, buf) {
                var token = buf.toString("hex");
                done(err, token);
            });
        },
        function(token, done) {
            const { username } = req.body;
            console.log(username);
            User.find({$or: [{username: username}, {email: username}] }, async (err, users) => {
                if(err){
                    console.error(err); // todo: report this
                    return res.render("errorLanding", {
                        title: "Error searching for user",
                        errorHTML: `<h3>There was an error finding a user with that username/email address. Please go back and try again.</h3>`,
                    });
                } else if(users?.length > 1) {
                    return res.render("errorLanding", {
                        title: "Too many users found",
                        errorHTML: `<h3>More than one user was returned... That shouldn't happen.</h3>`
                    });
                    // todo: report this case. 
                } else if(users.length === 1) {
                    const user = users[0];
                    let previousToken = await Token.findOne({ userId: user._id });
                    if (previousToken) await previousToken.deleteOne();

                    const hash = await bcrypt.hash(token, Number(bcryptSalt));
                    new Token({
                        userId: user._id,
                        token: hash,
                        createdAt: Date.now(),
                    }).save(err => {
                        done(err, token, user);
                    });
                } else {
                    return res.render("errorLanding", {
                        title: "No users found",
                        errorHTML: `<h3>Didn't find a user with that username/email address. Please go back and try again.</h3><h4><a href="/auth/forgot-password">Re-enter email address or username</a></h4>`
                    });
                }
            })
        },
        function(token, user, done) {
            smtpTransport.sendMail({
                from: "Magnova <info@magnova.space>",
                to: user.email,
                subject: "Password Reset?",
                text: `Time for a new password?
                    Hello ${user.preferredName},
                    We received a request to reset your password. If this wasn't you, please email ${reportAddress}. If you do want to reset your password, copy and paste this link into your browser:
                    https://${req.headers.host}/auth/reset-password/${user._id}/${token}
                    Automated message sent for your password reset only. You will not be subscribed to any email digests because of this email.`,
                html: `<head>
                        <link href="https://fonts.googleapis.com/css2?family=Montserrat&amp;family=Poppins:wght@500&amp;display=swap" rel="stylesheet">
                    </head>
                    <body style="background-color: rgb(90, 35, 90);color: lavender;font-size: 20px;padding: 20px;font-family: 'Montserrat', sans-serif;">
                        <div style="background-color: rgb(180, 70, 180);padding: 20px 50px;">
                            <h1>Time for a new password?</h1>
                            <p>Hello ${user.preferredName},</p>
                            <p>We received a request to reset your password. If this wasn't you, please <a href="mailto:${reportAddress}" style="color: rgb(173, 245, 215);">send us an email</a>. If you do want to reset your password, click this link:</p>
                            <a href="https://${req.headers.host}/auth/reset-password/${user._id}/${token}" style="background-color: rgb(255, 158, 102);color: black;font-size: 30px;font-family: 'Poppins', sans-serif;border-radius: 0 0 30px 30px;margin-bottom: 20px;margin-top: 25px;margin-left: 25px;padding: 15px;border: 2px solid rgb(253, 144, 80);flex: 100px 0 0;width: 300px;">Reset my password</a>
                            <p>Automated message sent for your password reset only. You will not be subscribed to any email digests because of this email.</p>
                        </div>
                    </body>`
            }, err => {
                done(err, "done");
            });
        }
    ], err => {
        if(err) return next(err);
        return res.render("auth/resetPasswordSent", {
            title: "Emailing Password Reset – Magnova"
        });
    })
});
router.get("/reset-password/:userID/:resetToken", (req, res) => {
    if(req.params.userID.match(/^[0-9a-fA-F]{24}$/)){
        User.findById(req.params.userID, (err, user) => {
            if(err){
                console.error(err);
            } else if(!user){
                return res.render("errorLanding", {
                    title: "No User found",
                    errorHTML: `<h3>An incorrect user ID was entered for this password reset, so it won't work.</h3>`
                })
            } else {
                Token.findOne({ userId: user._id }, (err, existingResetToken) => {
                    if(err){
                        console.error(err);
                        return res.render("errorLanding", {
                            title: "Error looking up token",
                            errorHTML: `<h3>We should have sent you an email with a token for resetting your password. When we looked up the token in the URL you entered,we ran into an error. Please reach out to ${reportAddress} about the problems you're having.</h3>`
                        })
                    }
                    if(!existingResetToken){
                        return res.render("errorLanding", invalidKeyErrorPage)
                    }
                    return res.render("auth/resetPassword", {
                        title: "Resetting Password",
                        shownUser: user,
                        resetToken: req.params.resetToken
                    });
                });
            }
        });
    } else {
        return res.render("errorLanding", {
            title: "No User found",
            errorHTML: `<h3>An incorrect user ID was entered for this password reset, so it won't work.</h3>`
        });
    }
});
router.post("/reset-password/:userID/:resetToken", async (req, res) => {
    if(!req.params.userID.match(/^[0-9a-fA-F]{24}$/)){
        return res.render("errorLanding", {
            title: "User ID is invalid",
            errorHTML: `<h3>An incorrect user ID was entered for this password reset, so it won't work.</h3>
            <h3>If you believe this is an error, please contact ${reportAddress}</h3>`
        });
    } else {
        let existingResetToken = await Token.findOne({ userId: req.params.userID });
        if(!existingResetToken){
            return res.render("errorLanding", invalidKeyErrorPage);
        } else {
            const isValid = await bcrypt.compare(req.params.resetToken, existingResetToken.token);
            if (!isValid) {
                return res.render("errorLanding", invalidKeyErrorPage);
            } else {
                User.findById(req.params.userID, (findError, user) => {
                    if(findError){
                        console.error(findError);
                        return res.render("errorLanding", {
                            title: "Error looking up user",
                            errorHTML: `<h3>An incorrect user ID was entered for this password reset, so it won't work.</h3>`
                        })
                    } else if(!user){
                        return res.render("errorLanding", {
                            title: "No User found",
                            errorHTML: `<h3>We tried to find a user with the ID we sent (or you entered). We couldn't.</h3>`
                        })
                    } else {
                        user.setPassword(req.body.password, (setError) => {
                            if(setError){
                                console.error(setError);
                                return res.render("errorLanding", {
                                    title: "Error Resetting Password",
                                    errorHTML: `<h3>We tried to change your password, but there was an error. Please reach out to ${reportAddress} to figure out how we can help.</h3>`
                                })
                            } else {
                                user.save(saveError => {
                                    if(saveError){
                                        console.error(saveError);
                                        return res.render("errorLanding", {
                                            title: "Error Saving New Password",
                                            errorHTML: `<h3>We changed your password, but ran into an error when we tried to save it. Please reach out to ${reportAddress} to figure out how we can help.</h3>`
                                        });
                                    } else {
                                        existingResetToken.deleteOne();
                                        smtpTransport.sendMail({
                                            from: "Magnova <info@magnova.space>",
                                            to: user.email,
                                            subject: "We Reset Your Password",
                                            text: `Hello ${user.preferredName},
                                            We have successfully reset your Magnova password. If this wasn't you, please email ${reportAddress}. Otherwise, you can now log into Magnova with your new password.
                                            https://magnova.space/auth/login
                                            Automated message sent for your password reset only. You will not be subscribed to any email digests because of this email.`,
                                            html: `<head>
                                                    <link href="https://fonts.googleapis.com/css2?family=Montserrat&amp;family=Poppins:wght@500&amp;display=swap" rel="stylesheet">
                                                </head>
                                                <body style="background-color: rgb(90, 35, 90);color: lavender;font-size: 20px;padding: 20px;font-family: 'Montserrat', sans-serif;">
                                                    <div style="background-color: rgb(180, 70, 180);padding: 20px 50px;">
                                                        <h1>Password Reset Complete</h1>
                                                        <p>Hello ${user.preferredName},</p>
                                                        <p>We have successfully reset your Magnova password. If this wasn't you, please <a href="mailto:${reportAddress}" style="color: rgb(173, 245, 215);">send us an email</a>. Otherwise, you can now log in with your new password:</p>
                                                        <a href="https://${req.headers.host}/auth/login" style="background-color: rgb(255, 158, 102);color: black;font-size: 30px;font-family: 'Poppins', sans-serif;border-radius: 0 0 30px 30px;margin-bottom: 20px;margin-top: 25px;margin-left: 25px;padding: 15px;border: 2px solid rgb(253, 144, 80);flex: 100px 0 0;width: 300px;">Log Into Magnova</a>
                                                        <p>Automated message sent for your password reset only. You will not be subscribed to any email digests because of this email.</p>
                                                    </div>
                                                </body>`
                                        });
                                        return res.redirect("/auth/login");
                                    }
                                });
                            }
                        });
                    }
                });
            }
        }
    }
});

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
router.get("/my_data", isLoggedIn, (req, res) => {
    User.findById(req.user._id, (err, user) => {
        if(err){
            res.send(`Couldn't find your data... ${err}`);
        }
        else {
            res.send(user);
        }
    });
    
});
router.put("/my_data", isLoggedIn, async (req, res) => {
    const {preferredName, email, bio, pfpLink, bannerLink} = req.body;
    if(!email){
        return res.send("Email is a required field");
    }
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
            user.preferredName = preferredName;
            user.bio = bio;
            user.pfpLink = pfpLink;
            user.bannerLink = bannerLink; 
                user.markModified("bannerLink");
            let returnMessage = `Update successful!`;
            //Before changing email, check if other users' usernames or emails conflict with the updated email (or, once changeable, username)
            User.find({$and: [
                { _id: { $not: { $eq: req.user._id } } },
                { $or: [{username: email}, {email: email}] }
            ]}, (err, users) => {
                if(err){
                    console.error(err); // todo: report this
                    returnMessage = "Error searching for users who may have the same email address, or a username equal to the email address you submitted";
                } else {
                    if(users?.length > 0) {
                        returnMessage = `Somebody else's username or email address is equal to this new email address you put in. Contact ${reportAddress} if this is a problem. Other updates were successful.`;
                        // todo: report this case. 
                    } else {
                        // user.username = username; implementing username changes will require some modification of the middleware for serializing users
                        user.email = email;
                    }
                }
                user.save();
                console.log(returnMessage);
                return res.send(returnMessage);
            });
        }
    });
});
router.post("/register", async (req, res) => {
    const {username, password, email} = req.body;
    if(username.length > 30){
        return res.send("Sorry, that username is way too long. 30 characters max.");
    }
    const lowercaseUsername = username.slice(0).toLowerCase();

    if(["all", "nobody", "unpopulated"].includes(lowercaseUsername)){
        return res.send("That word is reserved, sorry")
    }
    const lowercaseEmail = email.slice(0).toLowerCase();
    User.findOne({ $or: [{username: lowercaseUsername}, {email: lowercaseUsername}] }, async (err, user) => {
        if(err){
            console.log(err);
        }
        else if(user){
            return res.send("Sorry, that username has been taken, or it is somebody's email address.");
        }
        else{
            User.find({ $or: [{username: lowercaseEmail}, {email: lowercaseEmail}] }, async (err, user) => {
                if(err){
                    console.log(err);
                }
                else if(user.length > 0){
                    return res.send(`Sorry, that email has been taken, or it is somebody's username. Try resetting your password on the login screen, or contact ${reportAddress} if something is wrong.`);
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