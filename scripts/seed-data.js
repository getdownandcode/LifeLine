const mongoose = require('mongoose');
const Donor = require('../services/matching/src/models/Donor');
const Inventory = require('../services/inventory/src/models/Inventory');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:change_me_mongo@localhost:27017/lifeline_matching?authSource=admin');
  await Donor.create([
    {
      name: 'Sample O Negative Donor',
      bloodType: 'O-',
      organTypes: ['kidney'],
      location: { type: 'Point', coordinates: [72.8777, 19.076] },
      contact: { phone: '+10000000000', email: 'donor@example.com' },
      availability: true,
      healthStatus: 'healthy',
      responseRate: 0.95
    }
  ]);
  await mongoose.disconnect();

  await mongoose.connect(process.env.INVENTORY_MONGODB_URI || 'mongodb://admin:change_me_mongo@localhost:27017/lifeline_inventory?authSource=admin');
  await Inventory.create({
    hospitalId: new mongoose.Types.ObjectId(),
    bloodType: 'O-',
    unitsAvailable: 12,
    unitsReserved: 0,
    location: { type: 'Point', coordinates: [72.8777, 19.076] }
  });
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
