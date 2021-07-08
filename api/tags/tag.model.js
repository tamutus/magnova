const mongoose = require("mongoose"),
      Schema = mongoose.Schema;

const TagSchema = new Schema({
    name: {
        type: String,
        unique: true
    },
    image: String,
    info: String,
    creator: {type: Schema.Types.ObjectId, ref: "User"},
    creationDate: {type: Date, default: Date.now },
    talkPage: {type: Schema.Types.ObjectId, ref: "Talkpage"},
    followers: [{type: Schema.Types.ObjectId, ref: "User"}],
    // Links to instances of this tag
    issues: [{type: Schema.Types.ObjectId, ref: "IssueTemplate"}],
    projects: [{type: Schema.Types.ObjectId, ref: "ProjectTemplate"}],
    tasks: [{type: Schema.Types.ObjectId, ref: "TaskTemplate"}],
    badges: [{type: Schema.Types.ObjectId, ref: "Badge"}],
    skills: [{type: Schema.Types.ObjectId, ref: "Skill"}],
    locations: [{type: Schema.Types.ObjectId, ref: "Location"}],
    harms: [{type: Schema.Types.ObjectId, ref: "Harm"}],
    resources: [{type: Schema.Types.ObjectId, ref: "Resource"}]
});

module.exports = mongoose.model("Tag", TagSchema);