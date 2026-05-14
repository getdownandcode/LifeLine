const EmergencyRequest = require('../models/EmergencyRequest');
const { EVENTS, EXCHANGES } = require('../../../../shared/constants/eventTypes');
const { getCompatibleBloodTypes } = require('../../../../shared/constants/bloodTypes');
const { created, ok } = require('../../../../shared/utils/response');
const {
  requireFields,
  assertBloodType,
  assertOrganType,
  assertObjectId,
  normalizeUrgency,
  parseCoordinate
} = require('../../../../shared/utils/validators');
const { toPoint } = require('../utils/geo');
const { rankDonors } = require('../services/matchingEngine');
const { findNearbyDonors } = require('../services/geoService');
const { matchCacheKey, getJson, setJson } = require('../services/cacheService');

function buildController({ redis, publisher }) {
  async function createEmergency(req, res, next) {
    try {
      requireFields(req.body, ['patientId', 'bloodType', 'hospitalId', 'lat', 'lng']);
      assertBloodType(req.body.bloodType);
      assertOrganType(req.body.organRequired);
      assertObjectId(req.body.hospitalId, 'hospitalId');

      const request = await EmergencyRequest.create({
        patientId: req.body.patientId,
        bloodType: req.body.bloodType,
        organRequired: req.body.organRequired,
        hospitalId: req.body.hospitalId,
        urgency: normalizeUrgency(req.body.urgency),
        location: toPoint(parseCoordinate(req.body.lng, 'lng'), parseCoordinate(req.body.lat, 'lat'))
      });

      publisher?.publish(EXCHANGES.DIRECT, EVENTS.EMERGENCY_CREATED, {
        requestId: request.id,
        location: { lat: req.body.lat, lng: req.body.lng },
        bloodType: request.bloodType,
        urgency: request.urgency,
        hospitalId: request.hospitalId
      });

      return created(res, request);
    } catch (error) {
      return next(error);
    }
  }

  async function recentEmergencies(req, res, next) {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 25);
      const requests = await EmergencyRequest.find()
        .sort({ requestedAt: -1, createdAt: -1 })
        .limit(limit)
        .lean();

      return ok(res, requests);
    } catch (error) {
      return next(error);
    }
  }

  async function nearbyDonors(req, res, next) {
    try {
      requireFields(req.query, ['lat', 'lng', 'radius', 'bloodType']);
      assertBloodType(req.query.bloodType);
      assertOrganType(req.query.organRequired);
      const location = toPoint(parseCoordinate(req.query.lng, 'lng'), parseCoordinate(req.query.lat, 'lat'));
      const radiusMeters = Math.min(Number(req.query.radius), 100000);
      const cacheKey = matchCacheKey(location, req.query.bloodType, radiusMeters, req.query.organRequired);
      const cached = await getJson(redis, cacheKey);
      if (cached) return ok(res, { items: cached, cached: true });

      const donors = await findNearbyDonors({
        location,
        bloodType: req.query.bloodType,
        radiusMeters,
        organRequired: req.query.organRequired,
        limit: Number(req.query.limit) || 50
      });
      const emergency = { location, bloodType: req.query.bloodType, organRequired: req.query.organRequired, urgency: 'standard' };
      const ranked = rankDonors(donors, emergency).slice(0, Number(req.query.limit) || 10);
      await setJson(redis, cacheKey, ranked, 300);
      return ok(res, { items: ranked, cached: false });
    } catch (error) {
      return next(error);
    }
  }

  async function compatibility(req, res, next) {
    try {
      assertBloodType(req.params.type);
      return ok(res, { recipientBloodType: req.params.type, donorBloodTypes: getCompatibleBloodTypes(req.params.type) });
    } catch (error) {
      return next(error);
    }
  }

  async function triggerMatch(req, res, next) {
    try {
      assertObjectId(req.params.requestId, 'requestId');
      const request = await EmergencyRequest.findById(req.params.requestId);
      if (!request) {
        const error = new Error('Emergency request not found');
        error.statusCode = 404;
        throw error;
      }

      const radiusMeters = request.urgency === 'critical' ? 10000 : 25000;
      const donors = await findNearbyDonors({
        location: request.location,
        bloodType: request.bloodType,
        organRequired: request.organRequired,
        radiusMeters
      });
      const ranked = rankDonors(donors, request).slice(0, 10);

      if (ranked[0]) {
        request.status = 'matched';
        request.matchedDonorId = ranked[0].donor._id;
        request.matchedAt = new Date();
        await request.save();
        publisher?.publish(EXCHANGES.DIRECT, EVENTS.MATCH_FOUND, {
          requestId: request.id,
          donorId: ranked[0].donor._id,
          distanceKm: ranked[0].distanceKm,
          compatibilityScore: ranked[0].compatibilityScore
        });
      }

      return ok(res, { request, matches: ranked });
    } catch (error) {
      return next(error);
    }
  }

  async function matchStatus(req, res, next) {
    try {
      assertObjectId(req.params.id, 'requestId');
      const request = await EmergencyRequest.findById(req.params.id);
      if (!request) {
        const error = new Error('Emergency request not found');
        error.statusCode = 404;
        throw error;
      }
      return ok(res, request);
    } catch (error) {
      return next(error);
    }
  }

  return { createEmergency, recentEmergencies, nearbyDonors, compatibility, triggerMatch, matchStatus };
}

module.exports = { buildController };
