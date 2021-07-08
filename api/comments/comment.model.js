const mongoose = require("mongoose"),
      Schema = mongoose.Schema;

var CommentSchema = new Schema({
    text: String,
    topic: {type: Schema.Types.ObjectId, ref: "Talkpage"},
    threadIndex: Number,
    author: {type: Schema.Types.ObjectId, ref: "User"},
    date: {type: Date, default: Date.now},
    edited: {type: Boolean, default: false},
    editDate: Date,
    replyingTo: {type : Schema.Types.ObjectId, ref: "Comment"},
    replies: [{type: Schema.Types.ObjectId, ref: "Comment"}]
});

module.exports = mongoose.model("Comment", CommentSchema);