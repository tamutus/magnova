// Metrics for determing damages that are caused by an issue. A harm is specific—one metric that uses one unit. 
// A useful harm identification might be "Missed Meals", with a unit of "meals missed per week", 
// rather than a general issue like "Food Scarcity" which encapsulates many measurable harms.
const mongoose = require("mongoose"),
      Schema = mongoose.Schema;

const HarmSchema = new Schema({
    name: String,
    unit: String,
    image: String,
    info: String,
    edits: {type: Schema.Types.ObjectId, ref: "Patchlist"},
    version: {type: Number, default: 0},
    tags: [{type: Schema.Types.ObjectId, ref: "Tag"}],
    identifier: {type: Schema.Types.ObjectId, ref: "User"},
    identificationDate: {type: Date, default: Date.now },
    editors: [{type: Schema.Types.ObjectId, ref: "User"}],
    talkpage: {type: Schema.Types.ObjectId, ref: "Talkpage"},
    // Links to instances of this harm, sorted by the amount of harm
    issues: {
        general: [{
            issue: {type: Schema.Types.ObjectId, ref: "IssueTemplate"},
            degree: Number
        }],
        local: [{
            issue: {type: Schema.Types.ObjectId, ref: "LocalIssue"},
            degree: Number
        }]
    },
    projects: {
        general: [{
            issue: {type: Schema.Types.ObjectId, ref: "ProjectTemplate"},
            degree: Number
        }],
        local: [{
            issue: {type: Schema.Types.ObjectId, ref: "LocalProject"},
            degree: Number
        }]
    },
    tasks: {
        general: [{
            issue: {type: Schema.Types.ObjectId, ref: "TaskTemplate"},
            degree: Number
        }],
        local: [{
            issue: {type: Schema.Types.ObjectId, ref: "LocalTask"},
            degree: Number
        }]
    },
    geo: [{ 
        // Sort by degree in the update routes
        location: {type: Schema.Types.ObjectId, ref: "Location"},
        degree: Number
    }]
});

module.exports = mongoose.model("Harm", HarmSchema);