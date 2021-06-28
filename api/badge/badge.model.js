'use strict';

const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var BadgeSchema = new Schema({
  name: String,
  info: String,
  creationDate: {type: Date, default: Date.now},
  winners: [{type: Schema.Types.ObjectId, ref: 'User'}],
  awardingTasks: [{type: Schema.Types.ObjectId, ref: 'Task'}],
  locations: [{type: Schema.Types.ObjectId, ref: 'Location'}],
  points: Number,
  talkPage: {type: Schema.Types.ObjectId, ref: 'Talkpage'},
});

module.exports = mongoose.model('Badge', BadgeSchema);