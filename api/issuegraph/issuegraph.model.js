'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var IssuegraphSchema = new Schema({
  // user: { type: Schema.Types.ObjectId, ref: "User"},
  root: Schema.Types.ObjectId,
  edges: [{score: Number, vertex: { type: Schema.Types.ObjectId, ref: 'Issue'}}],
  active: {type: Boolean, default: true}
});

module.exports = mongoose.model('Issuegraph', IssuegraphSchema);