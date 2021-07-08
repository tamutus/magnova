var mongoose = require("mongoose"),
    Schema = mongoose.Schema;

var LocalIssueSchema = new Schema({
    template: {type: Schema.Types.ObjectId, ref: "IssueTemplate"},
    localInfo: String,
    image: { type: String, default: "https://pixahive.com/wp-content/uploads/2020/12/Seed-221261-pixahive.jpg" },
    location: {type: Schema.Types.ObjectId, ref: "Location"},
    localizer: {type: Schema.Types.ObjectId, ref: "User"},
    localizationDate: {type: Date, default: Date.now},
    editors: [{type: Schema.Types.ObjectId, ref: "User"}],
    talkpage: {type: Schema.Types.ObjectId, ref: "Talkpage"},
    harms: [{
        form: {type: Schema.Types.ObjectId, ref: "Harm"},
        degree: Number
    }],
    resources: [{
        form: {type: Schema.Types.ObjectId, ref: "Resource"}, 
        needed: Number,
        received: {type: Number, default: 0}
    }],
    active: {type: Boolean, default: true}
});

module.exports = mongoose.model("LocalIssue", LocalIssueSchema);