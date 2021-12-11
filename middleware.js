const   Talkpage = require("./api/comments/talkpage.model"),
        Comment = require("./api/comments/comment.model");

module.exports.isLoggedIn = function(req, res, next){
    if(!req.isAuthenticated()){
        return res.redirect("/auth/login");
    }
    next();
}
module.exports.deleteTalkpage = async function(talkpageID, req){
    if(talkpageID.match(/^[0-9a-fA-F]{24}$/)){
        if(!req.isAuthenticated()){
            return "Not authenticated";
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
                    for(thread of talkpage.threads){
                        for(comment of thread.comments){
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
                                    console.log(err);
                                }
                            });
                        }
                    }
                    for(author of authorsToSave){
                        author.save();
                    }
                    Talkpage.deleteOne({id: talkpageID}, err => {
                        if(err){
                            console.log(err);
                            return res.send(`Error deleting the Talkpage for this Task: ${err}`);
                        }
                    });
                    commentsDeletionResult = "success";
                    return;
                }
            })
            .catch(err => {
                console.log(err);
                commentsDeletionResult = `Error finding the Talkpage for this Task: ${err}`;
                return;
            });
            return commentsDeletionResult;
    } else {
        return `Invalid Talkpage ID: ${talkpageID}`;
    }
        
}