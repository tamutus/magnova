const mongoose = require("mongoose"),
      Schema = mongoose.Schema;

var SkillSchema = new Schema({
    name: String,
    imageLink: String,
    info: String,
    creator: {type: Schema.Types.ObjectId, ref: "User"},
    creationDate: {type: Date, default: Date.now},
    leaders: [{ // keep sorted by hours in update route
        user: {type: Schema.Types.ObjectId, ref: "User"},
        hours: Number
    }],
    badge: {type: Schema.Types.ObjectId, ref: "Badge"},
    tasks: [{type: Schema.Types.ObjectId, ref: "TaskTemplate"}],
    talkpage: {type: Schema.Types.ObjectId, ref: "Talkpage"},
    tags: [{type: Schema.Types.ObjectId, ref: "Tag"}]
});

module.exports = mongoose.model("Skill", SkillSchema);