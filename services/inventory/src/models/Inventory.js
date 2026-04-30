const mongoose = require('mongoose');
const { BLOOD_TYPES } = require('../../../../shared/constants/bloodTypes');

const pointSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point', required: true },
  coordinates: { type: [Number], required: true }
}, { _id: false });

const inventorySchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  bloodType: { type: String, enum: BLOOD_TYPES, required: true, index: true },
  unitsAvailable: { type: Number, min: 0, default: 0 },
  unitsReserved: { type: Number, min: 0, default: 0 },
  expiryDates: [{ unitId: String, expiry: Date }],
  location: { type: pointSchema, required: true, index: '2dsphere' },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

inventorySchema.index({ hospitalId: 1, bloodType: 1 }, { unique: true });
inventorySchema.index({ unitsAvailable: 1, bloodType: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
