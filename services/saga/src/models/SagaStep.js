const mongoose = require('mongoose');

const sagaStepSchema = new mongoose.Schema({
  requestId: { type: String, required: true, index: true },
  event: { type: String, required: true, index: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  compensation: { type: mongoose.Schema.Types.Mixed, default: null },
  sequence: { type: Number, required: true, index: true }
}, { timestamps: true });

sagaStepSchema.index({ requestId: 1, sequence: 1 });

module.exports = mongoose.model('SagaStep', sagaStepSchema);
