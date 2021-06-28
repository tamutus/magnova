'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var ProjectSchema = new Schema({
  name: String,
  info: String,
  active: Boolean,
  path: String,
  creator: String,
  creationDate: {type: Date, default: Date.now},
  template: {type: Schema.Types.ObjectId, ref: "Template"},
  location: {type: Schema.Types.ObjectId, ref: "Location"},
  budget: Number,
  costNeeded: Number,
  talkPage: {type: Schema.Types.ObjectId, ref: 'Talkpage'},
  issues: {type: Schema.Types.ObjectId, ref: 'Issuegraph' },
  tasks: {type: Schema.Types.ObjectId, ref: 'Taskgraph' },
  deadline: Date
});

module.exports = mongoose.model('Project', ProjectSchema);