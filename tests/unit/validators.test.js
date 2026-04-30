const test = require('node:test');
const assert = require('node:assert/strict');
const { assertObjectId, normalizeUrgency } = require('../../shared/utils/validators');

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
