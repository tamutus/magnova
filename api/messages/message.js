// To do before implementing: encrypt messages
// https://attacomsian.com/blog/nodejs-encrypt-decrypt-data

const mongoose = require("mongoose"),
      Schema = mongoose.Schema;

var MessageSchema = new Schema({
    text: String,
    sender: {type: Schema.Types.ObjectId, ref: "User"},
    recipient: {type: Schema.Types.ObjectId, ref: "User"},
    date: {type: Date, default: Date.now},
    edited: {type: Boolean, default: false},
    editDate: Date,
    replyingTo: {type : Schema.Types.ObjectId, ref: "Message"},
    replies: [{type: Schema.Types.ObjectId, ref: "Message"}]
});

module.exports = mongoose.model("Message", MessageSchema);