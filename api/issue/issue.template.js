const mongoose = require("mongoose"),
      mongoose_fuzzy_searching = require('mongoose-fuzzy-searching-v3'),
      Schema = mongoose.Schema;

const IssueTemplateSchema = new Schema({
    name: String,
    info: String,
    image: { type: String, default: "https://pixahive.com/wp-content/uploads/2020/12/Seed-221261-pixahive.jpg" },
    tags: [{type: Schema.Types.ObjectId, ref: "Tag"}],
    identifier: {type: Schema.Types.ObjectId, ref: "User"},
    identificationDate: {type: Date, default: Date.now },
    editors: [{type: Schema.Types.ObjectId, ref: "User"}],
    edits: {type: Schema.Types.ObjectId, ref: "Patchlist"},
    version: {type: Number, default: 0},
    talkpage: {type: Schema.Types.ObjectId, ref: "Talkpage"},
    harms: [{
        form: {type: Schema.Types.ObjectId, ref: "Harm"},
        records: [{
            degree: Number,
            citation: String,
            when: Date
        }]
    }],
    resources: [{
        form: {type: Schema.Types.ObjectId, ref: "Resource"}, 
        needed: Number,
        received: {type: Number, default: 0}
    }],
    active: {type: Boolean, default: true},
    instances: [{type: Schema.Types.ObjectId, ref: "LocalIssue"}],
    issues: {type: Schema.Types.ObjectId, ref: "Issuegraph" },
    projects: {type: Schema.Types.ObjectId, ref: "Projectgraph"}
});
IssueTemplateSchema.plugin(mongoose_fuzzy_searching, { fields: ['name'] });
module.exports = mongoose.model("IssueTemplate", IssueTemplateSchema);