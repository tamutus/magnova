// Taskgraph should be updated when harms are changed for a task template (?)
const mongoose = require("mongoose"),
      Schema = mongoose.Schema;

const PatchlistSchema = new Schema({
    root: Schema.Types.ObjectId,
    rootType: String,
    patches: [{
        editor: {type: Schema.Types.ObjectId, ref: "User"},
        editDate: {type: Date, default: Date.now},
        patch: Schema.Types.Mixed // Must use markModified("patches") ... or perhaps markModified("patches.patch")?
    }]
});

module.exports = mongoose.model("Patchlist", PatchlistSchema);