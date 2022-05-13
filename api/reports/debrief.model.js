const mongoose = require("mongoose"),
      Schema = mongoose.Schema;

const DebriefSchema = new Schema({
    task: {type: Schema.Types.ObjectId, ref: "TaskTemplate"},
    finisher: {type: Schema.Types.ObjectId, ref: "User"},
    timestamp: {type: Date, default: Date.now()},
    text: String,
    feedback: [{
        reviewer: {type: Schema.Types.ObjectId, ref: "User"},
        text: String,
        timestamp: {type: Date, default: Date.now()}
    }],
    accepted: {type: Boolean, default: false},
    validator: {type: Schema.Types.ObjectId, ref: "User"}
});

module.exports = mongoose.model("Debrief", DebriefSchema);