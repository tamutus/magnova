'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var LocationSchema = new Schema({
  name: {type: String, unique: true},
  coords: [[[Number]]],
  info: String,
  active: Boolean,
  creationDate: {type: Date, default: Date.now },
  updateDate: Date,
  origin: String,
  superlocation: {type: Schema.Types.ObjectId, ref: 'Location'},
  sublocations: [{type: Schema.Types.ObjectId, ref: 'Location'}],
  funding: Number,
  budget: Number,
  talkPage: {type: Schema.Types.ObjectId, ref: 'Talkpage'},
  issues: {type: Schema.Types.ObjectId, ref: 'Issuegraph' },
  projects: {type: Schema.Types.ObjectId, ref: 'Projectgraph'},
  tasks: {type: Schema.Types.ObjectId, ref: 'Taskgraph' }
});

module.exports = mongoose.model('Issue', LocationSchema);