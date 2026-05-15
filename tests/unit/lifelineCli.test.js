const test = require('node:test');
const assert = require('node:assert/strict');
const { bearerToken, emergencyPayload, parseArgs, usage } = require('../../scripts/lifeline');

test('CLI parser separates positional commands and options', () => {
  const parsed = parseArgs([
    'inventory',
    'reserve',
    '660000000000000000000101',
    '--blood',
    'A+',
    '--units',
    '1',
    '--json'
  ]);

  assert.deepEqual(parsed.positional, ['inventory', 'reserve', '660000000000000000000101']);
  assert.deepEqual(parsed.options, { blood: 'A+', units: '1', json: true });
});

test('CLI can generate a bearer token for gateway demo requests', () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-secret';

  try {
    assert.match(bearerToken(), /^[\w-]+\.[\w-]+\.[\w-]+$/);
  } finally {
    process.env.JWT_SECRET = previousSecret;
  }
});

test('CLI usage mentions demo commands under demo help', () => {
  assert.match(usage('demo'), /demo run/);
  assert.match(usage('demo'), /demo seed/);
});

test('CLI usage lists compatibility in main help', () => {
  assert.match(usage(), /compatibility <bloodType>/);
});

test('emergency create payload normalizes user-friendly urgency aliases', async () => {
  const payload = await emergencyPayload({
    patient: 'amar',
    blood: 'O+',
    organ: 'kidney',
    hospital: '660000000000000000000101',
    lat: '18.902',
    lng: '67.8764',
    urgency: 'High'
  });

  assert.equal(payload.urgency, 'urgent');
  assert.equal(payload.lat, 18.902);
  assert.equal(payload.lng, 67.8764);
});
