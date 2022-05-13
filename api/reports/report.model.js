const mongoose = require("mongoose"),
      Schema = mongoose.Schema;

const ReportSchema = new Schema({
    link: String,
    sender: {type: Schema.Types.ObjectId, ref: "User"},
    timestamp: {type: Date, default: Date.now()},
    text: String,
    responses: [{
        text: String,
        responder: {type: Schema.Types.ObjectId, ref: "User"},
        timestamp: {type: Date, default: Date.now()}
    }]
});

module.exports = mongoose.model('Report', ReportSchema);