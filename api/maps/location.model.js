const mongoose = require("mongoose"),
      Schema = mongoose.Schema;

const LocationSchema = new Schema({
    coords: [[[Number]]],
    name: {type: String, unique: true},
    superlocation: {type: Schema.Types.ObjectId, ref: "Location"},
    sublocations: [{type: Schema.Types.ObjectId, ref: "Location"}],
    info: String,
    tags: [{type: Schema.Types.ObjectId, ref: "Tag"}],
    resources: [{
        form: {type: Schema.Types.ObjectId, ref: "Resource"}, 
        needed: Number,
        received: {type: Number, default: 0},
    }],
    harms: [{
        form: {type: Schema.Types.ObjectId, ref: "Harm"},
        degree: Number
    }],
    talkpage: {type: Schema.Types.ObjectId, ref: "Talkpage"},
    issues: [{type: Schema.Types.ObjectId, ref: "LocalIssue"}],
    projects: [{type: Schema.Types.ObjectId, ref: "LocalProject"}],
    tasks: [{type: Schema.Types.ObjectId, ref: "LocalTask"}]
});

module.exports = mongoose.model("Location", LocationSchema);