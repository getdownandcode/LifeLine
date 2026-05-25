const test = require('node:test');
const assert = require('node:assert/strict');
const { assertObjectId, assertE164Phone, assertEmail, normalizeUrgency } = require('../../shared/utils/validators');

test('ObjectId validation returns a client error before Mongoose casts', () => {
  assert.doesNotThrow(() => assertObjectId('660000000000000000000101', 'hospitalId'));

  assert.throws(
    () => assertObjectId('1001', 'hospitalId'),
    (error) => error.statusCode === 400 && error.message === 'Invalid hospitalId: 1001'
  );
});

test('urgency normalization accepts supported CLI aliases', () => {
  assert.equal(normalizeUrgency('critical'), 'critical');
  assert.equal(normalizeUrgency('High'), 'urgent');
  assert.equal(normalizeUrgency(undefined), 'standard');

  assert.throws(
    () => normalizeUrgency('soon'),
    (error) => error.statusCode === 400 && error.message === 'Invalid urgency: soon'
  );
});

test('E.164 phone validation accepts supported notification targets', () => {
  assert.doesNotThrow(() => assertE164Phone('+1234567890'));
  assert.doesNotThrow(() => assertE164Phone('+911111111111'));
});

test('E.164 phone validation rejects malformed notification targets', () => {
  for (const phone of ['1234', '+', '+0123456789', '+1234567890123456', '+123-456', '+12 345']) {
    assert.throws(
      () => assertE164Phone(phone),
      (error) => error.statusCode === 400 && error.message === 'Invalid to: expected E.164 phone number'
    );
  }
});

test('email validation accepts supported notification targets', () => {
  assert.doesNotThrow(() => assertEmail('admin@hospital.com'));
  assert.doesNotThrow(() => assertEmail('first.last+tag@example.co'));
});

test('email validation rejects malformed notification targets', () => {
  const overLengthEmail = `${'a'.repeat(245)}@example.com`;

  for (const email of ['not-an-email', 'missing-at.example.com', '@example.com', 'name@', overLengthEmail]) {
    assert.throws(
      () => assertEmail(email),
      (error) => error.statusCode === 400 && error.message === 'Invalid to: expected email address'
    );
  }
});
