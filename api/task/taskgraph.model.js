'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var TaskgraphSchema = new Schema({
  type: String,
  order: String,
  root: Schema.Types.ObjectId,
  edges: [{ type: Schema.Types.ObjectId, ref: 'Task'}],
  active: Boolean
});

module.exports = mongoose.model('Taskgraph', TaskgraphSchema);