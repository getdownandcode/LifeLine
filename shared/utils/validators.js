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

function assertE164Phone(value, name = 'to') {
  if (typeof value !== 'string' || value.length > 16 || !/^\+[1-9]\d{1,14}$/.test(value)) {
    const error = new Error(`Invalid ${name}: expected E.164 phone number`);
    error.statusCode = 400;
    throw error;
  }
}

function assertEmail(value, name = 'to') {
  const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (typeof value !== 'string' || value.length > 254 || !emailPattern.test(value)) {
    const error = new Error(`Invalid ${name}: expected email address`);
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
  const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(number)) {
    const error = new Error(`Invalid ${name}`);
    error.statusCode = 400;
    throw error;
  }
  return number;
}

function parseNumericInput(value) {
  return typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
}

function assertPositiveUnits(value, name = 'units') {
  const number = parseNumericInput(value);
  if (!Number.isInteger(number) || number <= 0) {
    const error = new Error(`Invalid ${name}: expected a positive integer`);
    error.statusCode = 400;
    throw error;
  }
  return number;
}

function assertNonZeroUnits(value, name = 'unitsChange') {
  const number = parseNumericInput(value);
  if (!Number.isInteger(number) || number === 0) {
    const error = new Error(`Invalid ${name}: expected a non-zero integer`);
    error.statusCode = 400;
    throw error;
  }
  return number;
}

module.exports = {
  requireFields,
  assertBloodType,
  assertOrganType,
  assertObjectId,
  assertE164Phone,
  assertEmail,
  normalizeUrgency,
  parseCoordinate,
  assertPositiveUnits,
  assertNonZeroUnits
};
