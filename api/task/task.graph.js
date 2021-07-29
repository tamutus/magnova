// Taskgraph should be updated when harms are changed for a task template (?)
const mongoose = require("mongoose"),
      Schema = mongoose.Schema;

const TaskgraphSchema = new Schema({
    root: Schema.Types.ObjectId,
    rootType: String,
    edges: [{score: Number, vertex: { type: Schema.Types.ObjectId, ref: "TaskTemplate"}}]
});

module.exports = mongoose.model("Taskgraph", TaskgraphSchema);