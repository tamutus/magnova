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
            records: [{
                degree: Number,
                citation: String,
                when: Date
            }]
        }],
        local: [{
            issue: {type: Schema.Types.ObjectId, ref: "LocalIssue"},
            records: [{
                degree: Number,
                citation: String,
                when: Date
            }]
        }]
    },
    projects: {
        general: [{
            project: {type: Schema.Types.ObjectId, ref: "ProjectTemplate"},
            records: [{
                degree: Number,
                citation: String,
                when: Date
            }]
        }],
        local: [{
            project: {type: Schema.Types.ObjectId, ref: "LocalProject"},
            records: [{
                degree: Number,
                citation: String,
                when: Date
            }]
        }]
    },
    tasks: {
        general: [{
            task: {type: Schema.Types.ObjectId, ref: "TaskTemplate"},
            records: [{
                degree: Number,
                citation: String,
                when: Date
            }]
        }],
        local: [{
            task: {type: Schema.Types.ObjectId, ref: "LocalTask"},
            records: [{
                degree: Number,
                citation: String,
                when: Date
            }]
        }]
    },
    geo: [{ 
        // Sort by degree for in the update routes
        location: {type: Schema.Types.ObjectId, ref: "Location"},
        records: [{
            degree: Number,
            citation: String,
            when: Date
        }]
    }]
});

module.exports = mongoose.model("Harm", HarmSchema);