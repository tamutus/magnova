const   Talkpage = require("./api/comments/talkpage.model"),
        User = require("./api/user/user"),
        Comment = require("./api/comments/comment.model"),
        { ROLES } = require('./roles');

module.exports.reportAddress = "inventor@magnova.space";

module.exports.isLoggedIn = function(req, res, next){
    if(!req.isAuthenticated()){
        return res.redirect("/auth/login");
    }
    next();
}

module.exports.authorizeByRoles = (...roles) => (req, res, next) => {
    if(!req.user){
        res.status(401);
        return res.redirect("/auth/login");
    }
    if(!req.user.roles){
        User.findById(req.user._id, (err, user) => {
            if(err){
                return res.render("errorLanding", {
                    title: "No roles, and error updating – Magnova",
                    errorHTML: `<h3>Your user data didn't have a list of roles, and we encountered an error trying to load your user profile by id. Try logging in again, or email ${reportAddress}.</h3>`
                });
            } else if(!user){
                return res.render("errorLanding", {
                    title: "Error loading user data – Magnova",
                    errorHTML: `<h3>Your user data didn't have a list of roles, and we encountered an error trying to load your user profile from your current session. Try logging in again and refreshing, or email ${reportAddress}.</h3>`
                });
            } else {
                user.roles = [ROLES.Editor, ROLES.Activist, ROLES.Commentor];
                user.markModified("roles");
                user.save();
            }
        });
    }
    const hasRole = roles.find(role => req.user.roles?.includes(role));
    if(!hasRole){
        return res.redirect("/auth/unauthorized");
    }
    next();
}

module.exports.deleteTalkpage = async function(talkpageID, req){
    if(String(talkpageID).match(/^[0-9a-fA-F]{24}$/)){
        if(!req.isAuthenticated()){
            return "Not authenticated";
        }
        if(!req.user.roles.includes(ROLES.Mediator)){
            return "Not authorized";
        }
        let commentsDeletionResult;
        await Talkpage.findById(talkpageID)
            .populate({
                path: "threads.comments",
                populate: {
                    path: "author",
                    select: "comments"
                }
            })
            .exec()
            .then(talkpage => {
                if(!talkpage){
                    commentsDeletionResult = "There was no talkpage. Odd.";
                    return;
                } else {
                    const authorsToSave = [];
                    for(const thread of talkpage.threads){
                        for(const comment of thread.comments){
                            // For each comment, delete reference to it in the author's comments array. Replies are irrelevant when deleting the whole talkpage, since replies are made within a thread.
                            const userCommentsIndex = comment.author.comments.findIndex(c => String(c) === String(comment._id));
                            if(userCommentsIndex >= 0){
                                console.log(`This is comment ${userCommentsIndex} for user with id ${comment.author._id}`);
                                comment.author.comments.splice(userCommentsIndex, 1);
                                if(!authorsToSave.find(author => author._id === comment.author._id)){
                                    authorsToSave.push(comment.author);
                                }
                            }
                            // Then delete the comment itself.
                            
                            Comment.deleteOne({_id: comment._id}, err => {
                                if(err){
                                    console.error(err);
                                }
                            });
                        }
                    }
                    for(const author of authorsToSave){
                        author.save();
                    }
                    Talkpage.deleteOne({id: talkpageID}, err => {
                        if(err){
                            console.error(err);
                            return res.send(`Error deleting the Talkpage for this entity: ${err}`);
                        }
                    });
                    commentsDeletionResult = "success";
                    return;
                }
            })
            .catch(err => {
                console.error(err);
                commentsDeletionResult = `Error finding the Talkpage for this entity: ${err}`;
                return;
            });
            return commentsDeletionResult;
    } else {
        return `Invalid Talkpage ID: ${talkpageID}`;
    }
        
}