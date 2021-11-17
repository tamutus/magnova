const   mongoose = require("mongoose"),
        mongoose_fuzzy_searching = require('mongoose-fuzzy-searching'),
        Schema = mongoose.Schema;

const LocationSchema = new Schema({
    geometry: Schema.Types.Mixed,   // Can be multipolygon, polygon, point... 
                                    // Mixed types must be markModified before saving the model (e.g. location.markModified("geometry"); location.save();)
    geometrySource: String,
    name: String,
    color: String,
    WOE_ID: Number,
    osm_admin_level: Number,
    superlocation: {type: Schema.Types.ObjectId, ref: "Location"},
    sublocationWord: String,
    ownSubWord: String,
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
        records: [{
            degree: Number,
            citation: String,
            when: Date
        }]
    }],
    talkpage: {type: Schema.Types.ObjectId, ref: "Talkpage"},
    issues: [{type: Schema.Types.ObjectId, ref: "LocalIssue"}],
    projects: [{type: Schema.Types.ObjectId, ref: "LocalProject"}],
    tasks: [{type: Schema.Types.ObjectId, ref: "LocalTask"}]
});
LocationSchema.plugin(mongoose_fuzzy_searching, { fields: ['name'] });
module.exports = mongoose.model("Location", LocationSchema);