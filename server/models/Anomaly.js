const mongoose = require('mongoose');

const AnomalySchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  src_ip: {
    type: String,
    required: true
  },
  dst_ip: {
    type: String,
    required: true
  },
  src_port: {
    type: Number
  },
  dst_port: {
    type: Number
  },
  protocol: {
    type: String
  },
  threat_score: {
    type: Number,
    required: true
  },
  reconstruction_error: {
    type: Number
  },
  entropy: {
    type: Number
  },
  status: {
    type: String,
    enum: ['new', 'investigating', 'resolved'],
    default: 'new'
  }
});

module.exports = mongoose.model('Anomaly', AnomalySchema);
