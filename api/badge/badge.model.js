const mongoose = require("mongoose"),
      Schema = mongoose.Schema;

var BadgeSchema = new Schema({
    name: String,
    imageLink: String,
    info: String,
    creator: {type: Schema.Types.ObjectId, ref: "User"},
    creationDate: {type: Date, default: Date.now},
    winners: [{type: Schema.Types.ObjectId, ref: "User"}],
    awardingTask: {type: Schema.Types.ObjectId, ref: "TaskTemplate"},
    awardingSkill: {
        skill: {type: Schema.Types.ObjectId, ref: "Skill"},
        hours: Number
    },
    talkpage: {type: Schema.Types.ObjectId, ref: "Talkpage"},
    tags: [{type: Schema.Types.ObjectId, ref: "Tag"}]
});

module.exports = mongoose.model("Badge", BadgeSchema);