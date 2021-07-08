var mongoose = require("mongoose"),
    Schema = mongoose.Schema;

var IssuegraphSchema = new Schema({
    // user: { type: Schema.Types.ObjectId, ref: "User"},
    root: Schema.Types.ObjectId,
    rootType: String,
    edges: [{score: Number, vertex: { type: Schema.Types.ObjectId, ref: "IssueTemplate"}}]
});

module.exports = mongoose.model("Issuegraph", IssuegraphSchema);