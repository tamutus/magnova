const   mongoose = require("mongoose"),
        mongoose_fuzzy_searching = require('mongoose-fuzzy-searching-v3'),
        Schema = mongoose.Schema;

const ProjectTemplateSchema = new Schema({
    name: String,
    info: String,
    image: { type: String, default: "https://pixahive.com/wp-content/uploads/2020/12/Seed-221261-pixahive.jpg" },
    tags: [{type: Schema.Types.ObjectId, ref: "Tag"}],
    creator: {type: Schema.Types.ObjectId, ref: "User"},
    creationDate: {type: Date, default: Date.now},
    designers: [{type: Schema.Types.ObjectId, ref: "User"}], // People who edit the project and its tasks
    edits: {type: Schema.Types.ObjectId, ref: "Patchlist"},
    version: {type: Number, default: 0},
    talkpage: {type: Schema.Types.ObjectId, ref: "Talkpage"},
    volunteers: [{ // People who worked on tasks of this project
        user: {type: Schema.Types.ObjectId, ref: "User"}, 
        signupDate: {type: Date, default: Date.now},
        hoursVolunteered: Number
    }],
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
    implementations: [{type: Schema.Types.ObjectId, ref: "LocalProject"}],
    issues: {type: Schema.Types.ObjectId, ref: "Issuegraph"}, // Rather than listing sub-issues, this graph gives references back to issues that this project confronts
    tasks: {type: Schema.Types.ObjectId, ref: "Taskgraph"}, 
    completionRequirements: String
});
ProjectTemplateSchema.plugin(mongoose_fuzzy_searching, { fields: ['name'] });      
module.exports = mongoose.model("ProjectTemplate", ProjectTemplateSchema);