const Inventory = require('../models/Inventory');

async function getHospitalStock(hospitalId) {
  return Inventory.find({ hospitalId }).sort({ bloodType: 1 });
}

async function reserveUnits({ hospitalId, bloodType, units }) {
  const stock = await Inventory.findOneAndUpdate(
    { hospitalId, bloodType, unitsAvailable: { $gte: units } },
    { $inc: { unitsAvailable: -units, unitsReserved: units }, $set: { lastUpdated: new Date() } },
    { new: true }
  );

  if (!stock) {
    const error = new Error('Insufficient inventory for reservation');
    error.statusCode = 409;
    throw error;
  }

  return stock;
}

async function updateStock({ hospitalId, bloodType, unitsChange, location }) {
  return Inventory.findOneAndUpdate(
    { hospitalId, bloodType },
    {
      $inc: { unitsAvailable: unitsChange },
      $set: { location, lastUpdated: new Date() },
      $setOnInsert: { unitsReserved: 0 }
    },
    { new: true, upsert: true, runValidators: true }
  );
}

async function lowStock(threshold = 5) {
  return Inventory.find({ unitsAvailable: { $lte: threshold } }).sort({ unitsAvailable: 1 });
}

module.exports = { getHospitalStock, reserveUnits, updateStock, lowStock };
