const mongoose = require('mongoose');
const { BLOOD_TYPES } = require('../../../../shared/constants/bloodTypes');
const { ORGAN_TYPES } = require('../../../../shared/constants/organTypes');

const pointSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point', required: true },
  coordinates: { type: [Number], required: true }
}, { _id: false });

const donorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  bloodType: { type: String, enum: BLOOD_TYPES, required: true, index: true },
  organTypes: [{ type: String, enum: ORGAN_TYPES }],
  location: { type: pointSchema, required: true, index: '2dsphere' },
  contact: {
    phone: String,
    email: String,
    emergencyContact: String
  },
  availability: { type: Boolean, default: true, index: true },
  lastDonation: Date,
  responseRate: { type: Number, min: 0, max: 1, default: 0.75 },
  healthStatus: { type: String, enum: ['healthy', 'deferred', 'ineligible'], default: 'healthy' },
  geohash: String
}, { timestamps: true });

donorSchema.index({ location: '2dsphere', bloodType: 1, availability: 1, healthStatus: 1 });

module.exports = mongoose.model('Donor', donorSchema);
