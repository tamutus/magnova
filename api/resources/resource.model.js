// The resource model provides an interface between identifying what"s needeed and actually getting it. It keeps track of sources for the resource as well as money exchange rates

const mongoose = require("mongoose"),
      Schema = mongoose.Schema;

const ResourceSchema = new Schema({
    name: String,
    info: String,
    edits: {type: Schema.Types.ObjectId, ref: "Patchlist"},
    version: {type: Number, default: 0},
    image: String,
    unit: {type: String, default: "units"},
    identifier: {type: Schema.Types.ObjectId, ref: "User"},
    identificationDate: {type: Date, default: Date.now},
    tags: [{type: Schema.Types.ObjectId, ref: "Tag"}],
    formulas: [{type: Schema.Types.ObjectId, ref: "Formula"}],
    uses: [{type: Schema.Types.ObjectId, ref: "Formula"}],
    talkpage: {type: Schema.Types.ObjectId, ref: "Talkpage"},
    sources: [{
        //A source
        location: {type: Schema.Types.ObjectId, ref: "Location"},
        amount: Number
    }],
    seekers: [{
        profile: {type: Schema.Types.ObjectId, ref: "User"},
        amount: Number
    }],
    issues: {
        general: [{
            issue: {type: Schema.Types.ObjectId, ref: "IssueTemplate"},
            needed: Number
        }],
        local: [{
            issue: {type: Schema.Types.ObjectId, ref: "LocalIssue"},
            needed: Number,
            received: {type: Number, default: 0}
        }]
    },
    projects: {
        general: [{
            issue: {type: Schema.Types.ObjectId, ref: "ProjectTemplate"},
            needed: Number,
            received: {type: Number, default: 0}
        }],
        local: [{
            issue: {type: Schema.Types.ObjectId, ref: "LocalProject"},
            needed: Number,
            received: {type: Number, default: 0}
        }]
    },
    tasks: {
        general: [{
            issue: {type: Schema.Types.ObjectId, ref: "TaskTemplate"},
            needed: Number,
            received: {type: Number, default: 0}
        }],
        local: [{
            issue: {type: Schema.Types.ObjectId, ref: "LocalTask"},
            needed: Number,
            received: {type: Number, default: 0}
        }]
    },
    geo: [{ 
        // Sort by amount needed in the update routes
        location: {type: Schema.Types.ObjectId, ref: "Location"},
        needed: Number,
        received: {type: Number, default: 0}
    }]
});

module.exports = mongoose.model("Resource", ResourceSchema);