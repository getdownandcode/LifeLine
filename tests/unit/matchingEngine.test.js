const test = require('node:test');
const assert = require('node:assert/strict');
const { getCompatibleBloodTypes } = require('../../shared/constants/bloodTypes');
const { calculateDistanceKm } = require('../../services/matching/src/utils/geo');
const { donationRecencyScore, rankDonors } = require('../../services/matching/src/services/matchingEngine');
const { encode } = require('../../services/matching/src/utils/geohash');

test('blood compatibility matrix handles universal donor and recipient behavior', () => {
  assert.deepEqual(getCompatibleBloodTypes('O-'), ['O-']);
  assert.equal(getCompatibleBloodTypes('AB+').length, 8);
});

test('distance calculation is stable for nearby coordinates', () => {
  const distance = calculateDistanceKm(
    { type: 'Point', coordinates: [72.8777, 19.076] },
    { type: 'Point', coordinates: [72.886, 19.09] }
  );
  assert.equal(Number(distance.toFixed(1)), 1.8);
});

test('donation recency blocks donors inside the 56 day safety window', () => {
  const now = new Date('2026-04-30T00:00:00Z');
  assert.equal(donationRecencyScore('2026-04-10T00:00:00Z', now), 0);
  assert.equal(donationRecencyScore('2025-08-01T00:00:00Z', now), 1);
});

test('rankDonors filters incompatible and unavailable donors then sorts by score', () => {
  const emergency = {
    bloodType: 'A+',
    organRequired: 'kidney',
    urgency: 'critical',
    location: { type: 'Point', coordinates: [72.8777, 19.076] }
  };

  const donors = [
    {
      id: 'far-compatible',
      bloodType: 'O-',
      organTypes: ['kidney'],
      availability: true,
      healthStatus: 'healthy',
      responseRate: 0.8,
      location: { type: 'Point', coordinates: [72.99, 19.2] }
    },
    {
      id: 'near-compatible',
      bloodType: 'A+',
      organTypes: ['kidney'],
      availability: true,
      healthStatus: 'healthy',
      responseRate: 0.95,
      location: { type: 'Point', coordinates: [72.878, 19.077] }
    },
    {
      id: 'incompatible',
      bloodType: 'B+',
      organTypes: ['kidney'],
      availability: true,
      healthStatus: 'healthy',
      location: { type: 'Point', coordinates: [72.878, 19.077] }
    },
    {
      id: 'unavailable',
      bloodType: 'A+',
      organTypes: ['kidney'],
      availability: false,
      healthStatus: 'healthy',
      location: { type: 'Point', coordinates: [72.878, 19.077] }
    }
  ];

  const ranked = rankDonors(donors, emergency, new Date('2026-04-30T00:00:00Z'));
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].donor.id, 'near-compatible');
  assert.ok(ranked[0].compatibilityScore > ranked[1].compatibilityScore);
});

test('geohash encoder returns deterministic precision', () => {
  assert.equal(encode(19.076, 72.8777, 6), 'te7ud2');
});
