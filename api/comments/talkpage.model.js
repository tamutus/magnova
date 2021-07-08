const mongoose = require("mongoose"),
      Schema = mongoose.Schema;

var TalkpageSchema = new Schema({
    rootType: String,
    root: Schema.Types.ObjectId,
    threads: [{
        subject: String,
        lastActivity: Date,
        comments: [{type: Schema.Types.ObjectId, ref: "Comment"}]
    }]
});

module.exports = mongoose.model("Talkpage", TalkpageSchema);