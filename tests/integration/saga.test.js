const test = require('node:test');
const assert = require('node:assert/strict');
const { EVENTS } = require('../../shared/constants/eventTypes');
const { nextSagaStep } = require('../../services/saga/src/services/sagaService');

test('saga advances happy path events', () => {
  assert.deepEqual(
    nextSagaStep({ event: EVENTS.EMERGENCY_CREATED, payload: { requestId: 'r1' } }),
    { event: EVENTS.MATCH_REQUESTED, payload: { requestId: 'r1' } }
  );
  assert.deepEqual(
    nextSagaStep({ event: EVENTS.INVENTORY_RESERVED, payload: { requestId: 'r1' } }),
    { event: EVENTS.NOTIFICATION_SEND, payload: { requestId: 'r1' } }
  );
});

test('saga rolls back failed inventory reservation', () => {
  assert.deepEqual(
    nextSagaStep({ event: EVENTS.INVENTORY_FAILED, payload: { requestId: 'r1', reason: 'empty' } }),
    { event: EVENTS.MATCH_CANCELLED, payload: { requestId: 'r1', reason: 'empty' } }
  );
});
