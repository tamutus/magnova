'use strict';

const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var TaskSchema = new Schema({
  name: String,
  info: String,
  active: Boolean,
  path: String,
  creator: {type: Schema.Types.ObjectId, ref: 'User'},
  creationDate: {type: Date, default: Date.now},
  origin: String,
  locations: [String],
  cost: Number,
  budget: Number,
  costNeeded: Number,
  talkPage: {type: Schema.Types.ObjectId, ref: 'Talkpage'},
  issues: {type: Schema.Types.ObjectId, ref: 'Issuegraph'},
  projects: {type: Schema.Types.ObjectId, ref: 'Projectgraph'},
  deadline: Date,
  isComplete: {type: Boolean, default: false}
});

module.exports = mongoose.model('Task', TaskSchema);