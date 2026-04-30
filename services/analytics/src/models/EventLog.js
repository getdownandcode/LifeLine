const mongoose = require('mongoose');

const eventLogSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  event: { type: String, required: true, index: true },
  payload: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, required: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model('EventLog', eventLogSchema);
