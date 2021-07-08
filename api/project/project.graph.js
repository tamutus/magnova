const mongoose = require("mongoose"),
      Schema = mongoose.Schema;

const ProjectgraphSchema = new Schema({
    // user: { type: Schema.Types.ObjectId, ref: "User"},
    root: Schema.Types.ObjectId,
    rootType: String,
    edges: [{score: Number, vertex: { type: Schema.Types.ObjectId, ref: "ProjectTemplate"}}]
});

module.exports = mongoose.model("Projectgraph", ProjectgraphSchema);