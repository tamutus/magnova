const mongoose = require("mongoose"),
      Schema = mongoose.Schema;

var InboxSchema = new Schema({
    owner: {type: Schema.Types.ObjectId, ref: "User"},
    conversations: [{
        partner: {type: Schema.Types.ObjectId, ref: "User"},
        lastActivity: Date,
        messages: [{type: Schema.Types.ObjectId, ref: "Message"}]
    }]
});

module.exports = mongoose.model("Inbox", InboxSchema);