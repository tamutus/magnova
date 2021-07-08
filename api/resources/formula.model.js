const mongoose = require("mongoose"),
      Schema = mongoose.Schema;

const FormulaSchema = new Schema({
    name: String,
    ingredients: [{
        resource: {type: Schema.Types.ObjectId, ref: "Resource"},
        amount: Number
    }],
    products: [{
        resource: {type: Schema.Types.ObjectId, ref: "Resource"},
        amount: Number
    }],
    recipe: String,
    authors: [{type: Schema.Types.ObjectId, ref: "User"}],
    creationDate: {type: Date, default: Date.now},
    talkpage: {type: Schema.Types.ObjectId, ref: "Talkpage"},
    applications: {
        general: [{type: Schema.Types.ObjectId, ref: "TaskTemplate"}],
        local: [{type: Schema.Types.ObjectId, ref: "LocalTask"}]
    }
});

module.exports = mongoose.model("Formula", FormulaSchema);