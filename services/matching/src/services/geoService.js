const Donor = require('../models/Donor');
const { getCompatibleBloodTypes } = require('../../../../shared/constants/bloodTypes');

async function findNearbyDonors({ location, bloodType, radiusMeters, organRequired, limit = 50 }) {
  const query = {
    location: {
      $near: {
        $geometry: location,
        $maxDistance: radiusMeters
      }
    },
    bloodType: { $in: getCompatibleBloodTypes(bloodType) },
    availability: true,
    healthStatus: 'healthy'
  };

  if (organRequired) query.organTypes = organRequired;

  return Donor.find(query).limit(limit);
}

module.exports = { findNearbyDonors };
