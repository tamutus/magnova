'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var ProjectTemplateSchema = new Schema({
  name: String,
  info: String,
  active: Boolean,
  path: String,
  creator: String,
  creationDate: {type: Date, default: Date.now},
  implementations: [{type: Schema.Types.ObjectId, ref: "Project"}],
  cost: Number,
  budget: Number,
  costNeeded: Number,
  talkPage: {type: Schema.Types.ObjectId, ref: 'Talkpage'},
  issues: {type: Schema.Types.ObjectId, ref: 'Issuegraph' },
  tasks: {type: Schema.Types.ObjectId, ref: 'Taskgraph' },
  deadline: Date
});

module.exports = mongoose.model('Project', ProjectSchema);