const mongoose = require('mongoose');
const { BLOOD_TYPES } = require('../../../../shared/constants/bloodTypes');
const { ORGAN_TYPES } = require('../../../../shared/constants/organTypes');

const pointSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point', required: true },
  coordinates: { type: [Number], required: true }
}, { _id: false });

const emergencyRequestSchema = new mongoose.Schema({
  patientId: { type: String, required: true, index: true },
  bloodType: { type: String, enum: BLOOD_TYPES, required: true },
  organRequired: { type: String, enum: ORGAN_TYPES },
  location: { type: pointSchema, required: true, index: '2dsphere' },
  urgency: { type: String, enum: ['critical', 'urgent', 'standard'], default: 'standard', index: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  status: { type: String, enum: ['pending', 'matched', 'fulfilled', 'cancelled'], default: 'pending', index: true },
  matchedDonorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
  requestedAt: { type: Date, default: Date.now },
  matchedAt: Date
}, { timestamps: true });

emergencyRequestSchema.index({ location: '2dsphere', urgency: 1, status: 1 });

module.exports = mongoose.model('EmergencyRequest', emergencyRequestSchema);
