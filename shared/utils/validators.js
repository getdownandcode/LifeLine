const { BLOOD_TYPES } = require('../constants/bloodTypes');
const { ORGAN_TYPES } = require('../constants/organTypes');
const mongoose = require('mongoose');

const URGENCY_ALIASES = Object.freeze({
  critical: 'critical',
  emergency: 'critical',
  urgent: 'urgent',
  high: 'urgent',
  standard: 'standard',
  normal: 'standard'
});

function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
}

function assertBloodType(bloodType) {
  if (!BLOOD_TYPES.includes(bloodType)) {
    const error = new Error(`Invalid bloodType: ${bloodType}`);
    error.statusCode = 400;
    throw error;
  }
}

function assertOrganType(organType) {
  if (organType && !ORGAN_TYPES.includes(organType)) {
    const error = new Error(`Invalid organ type: ${organType}`);
    error.statusCode = 400;
    throw error;
  }
}

function assertObjectId(value, name = 'ObjectId') {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    const error = new Error(`Invalid ${name}: ${value}`);
    error.statusCode = 400;
    throw error;
  }
}

function normalizeUrgency(value = 'standard') {
  const normalized = URGENCY_ALIASES[String(value).trim().toLowerCase()];
  if (!normalized) {
    const error = new Error(`Invalid urgency: ${value}`);
    error.statusCode = 400;
    throw error;
  }
  return normalized;
}

function parseCoordinate(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    const error = new Error(`Invalid ${name}`);
    error.statusCode = 400;
    throw error;
  }
  return number;
}

module.exports = { requireFields, assertBloodType, assertOrganType, assertObjectId, normalizeUrgency, parseCoordinate };
