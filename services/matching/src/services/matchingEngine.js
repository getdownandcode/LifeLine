const { getCompatibleBloodTypes } = require('../../../../shared/constants/bloodTypes');
const { calculateDistanceKm } = require('../utils/geo');

const URGENCY_SCORE = Object.freeze({ critical: 1, urgent: 0.7, standard: 0.35 });

function donationRecencyScore(lastDonation, now = new Date()) {
  if (!lastDonation) return 1;
  const days = (now - new Date(lastDonation)) / 86400000;
  if (days < 56) return 0;
  if (days >= 180) return 1;
  return Math.min(1, (days - 56) / 124);
}

function reliabilityScore(donor) {
  if (typeof donor.reliabilityScore === 'number') {
    return Math.max(0, Math.min(1, donor.reliabilityScore));
  }
  if (typeof donor.responseRate === 'number') {
    return Math.max(0, Math.min(1, donor.responseRate));
  }
  return 0.75;
}

function calculateCompatibilityScore(donor, emergencyRequest, now = new Date()) {
  const distanceKm = Math.max(0.2, calculateDistanceKm(emergencyRequest.location, donor.location));
  const distanceScore = Math.min(1, 1 / distanceKm);
  const urgency = URGENCY_SCORE[emergencyRequest.urgency] || URGENCY_SCORE.standard;
  const reliability = reliabilityScore(donor);
  const recency = donationRecencyScore(donor.lastDonation, now);
  const organMatch = emergencyRequest.organRequired
    ? donor.organTypes?.includes(emergencyRequest.organRequired) ? 1 : 0
    : 1;

  return Number((
    40 * distanceScore +
    25 * urgency +
    20 * reliability +
    10 * recency +
    5 * organMatch
  ).toFixed(2));
}

function rankDonors(donors, emergencyRequest, now = new Date()) {
  const compatibleTypes = getCompatibleBloodTypes(emergencyRequest.bloodType);
  return donors
    .filter((donor) => donor.availability !== false)
    .filter((donor) => donor.healthStatus === undefined || donor.healthStatus === 'healthy')
    .filter((donor) => compatibleTypes.includes(donor.bloodType))
    .filter((donor) => !emergencyRequest.organRequired || donor.organTypes?.includes(emergencyRequest.organRequired))
    .map((donor) => ({
      donor,
      distanceKm: Number(calculateDistanceKm(emergencyRequest.location, donor.location).toFixed(2)),
      compatibilityScore: calculateCompatibilityScore(donor, emergencyRequest, now)
    }))
    .sort((left, right) => right.compatibilityScore - left.compatibilityScore || left.distanceKm - right.distanceKm);
}

module.exports = { calculateCompatibilityScore, donationRecencyScore, rankDonors };
