const mongoose = require("mongoose"),
      Schema = mongoose.Schema;

const LocationSchema = new Schema({
    geometry: Schema.Types.Mixed,   // Can be multipolygon, polygon, point... 
                                    // Mixed types must be markModified before saving the model (e.g. location.markModified("geometry"); location.save();)
    name: {type: String, unique: true},
    color: String,
    WOE_ID: Number,
    osm_admin_level: Number,
    superlocation: {type: Schema.Types.ObjectId, ref: "Location"},
    sublocations: [{type: Schema.Types.ObjectId, ref: "Location"}],
    sublocationFeatureCollectionURL: String,
    info: String,
    edits: {type: Schema.Types.ObjectId, ref: "Patchlist"},
    version: {type: Number, default: 0},
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