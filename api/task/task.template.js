const   mongoose = require("mongoose"),
        Schema   = mongoose.Schema;

var TaskTemplateSchema = new Schema({
    name: String,
    info: String,
    tags: [{type: Schema.Types.ObjectId, ref: "Tag"}],
    creator: {type: Schema.Types.ObjectId, ref: "User"},
    creationDate: {type: Date, default: Date.now},
    designers: [{type: Schema.Types.ObjectId, ref: "User"}],
    edits: {type: Schema.Types.ObjectId, ref: "Patchlist"},
    version: {type: Number, default: 0},
    volunteers: [{
        user: {type: Schema.Types.ObjectId, ref: "User"}, 
        signupDate: {type: Date, default: Date.now},
        hoursVolunteered: Number
    }],
    resources: [{
        resource: {type: Schema.Types.ObjectId, ref: "Resource"}, 
        needed: Number,
        received: {type: Number, default: 0}
    }],
    harms: [{
        form: {type: Schema.Types.ObjectId, ref: "Harm"},
        degree: Number
    }],
    talkpage: {type: Schema.Types.ObjectId, ref: "Talkpage"},
    precursors: [{type: Schema.Types.ObjectId, ref: "TaskTemplate"}],
    successors: [{type: Schema.Types.ObjectId, ref: "TaskTemplate"}],
    project: {type: Schema.Types.ObjectId, ref: "ProjectTemplate"},
    skills: [{type: Schema.Types.ObjectId, ref: "Skill"}],
    badge: {type: Schema.Types.ObjectId, ref: "Badge"},
    completionRequirements: String
});

module.exports = mongoose.model("TaskTemplate", TaskTemplateSchema);