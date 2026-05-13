const mongoose = require('mongoose');

const eventLogSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  event: { type: String, required: true, index: true },
  correlationId: { type: String, required: false, index: true },
  payload: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, required: true, index: true }
}, { timestamps: true });

// TTL index: automatically delete events after 30 days (2592000 seconds)
eventLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

// Compound index for time-series queries (event + timestamp)
eventLogSchema.index({ event: 1, timestamp: -1 });

module.exports = mongoose.model('EventLog', eventLogSchema);
