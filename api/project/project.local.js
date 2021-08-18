const mongoose = require("mongoose"),
      Schema = mongoose.Schema;

const LocalProjectSchema = new Schema({
    template: {type: Schema.Types.ObjectId, ref: "ProjectTemplate"},
    localInfo: String,
    image: String,
    location: {type: Schema.Types.ObjectId, ref: "Location"},
    localizer: {type: Schema.Types.ObjectId, ref: "User"},
    localizationDate: {type: Date, default: Date.now},
    editors: [{type: Schema.Types.ObjectId, ref: "User"}],
    edits: {type: Schema.Types.ObjectId, ref: "Patchlist"},
    version: {type: Number, default: 0},
    talkpage: {type: Schema.Types.ObjectId, ref: "Talkpage"},
    volunteers: [{
        user: {type: Schema.Types.ObjectId, ref: "User"}, 
        signupDate: {type: Date, default: Date.now},
        hoursVolunteered: Number
    }],
    harms: [{
        form: {type: Schema.Types.ObjectId, ref: "Harm"},
        degree: Number
    }],
    resources: [{
        form: {type: Schema.Types.ObjectId, ref: "Resource"}, 
        needed: Number,
        received: {type: Number, default: 0},
    }],
    localTasks: [{type: Schema.Types.ObjectId, ref: "LocalTask"}],
    deadline: Date,
    isComplete: {type: Boolean, default: false}
});

module.exports = mongoose.model("LocalProject", LocalProjectSchema);