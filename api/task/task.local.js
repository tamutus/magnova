const mongoose = require("mongoose"),
    Schema = mongoose.Schema;

const LocalTaskSchema = new Schema({
    name: String,
    localInfo: String,
    location: {type: Schema.Types.ObjectId, ref: "Location"},
    localizer: {type: Schema.Types.ObjectId, ref: "User"},
    localizationDate: {type: Date, default: Date.now},
    adapters: [{type: Schema.Types.ObjectId, ref: "User"}],
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
        records: [{
            degree: Number,
            citation: String,
            when: Date
        }]
    }],
    talkpage: {type: Schema.Types.ObjectId, ref: "Talkpage"},
    precursors: [{type: Schema.Types.ObjectId, ref: "LocalTask"}],
    successors: [{type: Schema.Types.ObjectId, ref: "LocalTask"}],
    localProject: {type: Schema.Types.ObjectId, ref: "LocalProject"},
    deadline: Date,
    isComplete: {type: Boolean, default: false}
});

module.exports = mongoose.model("LocalTask", LocalTaskSchema);