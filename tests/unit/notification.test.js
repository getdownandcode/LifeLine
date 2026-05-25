const test = require('node:test');
const assert = require('node:assert/strict');
const { requiredNotificationFields, validateNotificationRequest } = require('../../services/notification/src/server');

test('broadcast notifications only require a message', () => {
  assert.deepEqual(requiredNotificationFields('broadcast'), ['message']);
});

test('direct notifications require a target and message', () => {
  assert.deepEqual(requiredNotificationFields('sms'), ['to', 'message']);
  assert.deepEqual(requiredNotificationFields('email'), ['to', 'message']);
  assert.deepEqual(requiredNotificationFields('push'), ['to', 'message']);
});

test('notification request validation accepts valid sms and email targets', () => {
  assert.doesNotThrow(() => validateNotificationRequest('sms', { to: '+1234567890', message: 'ok' }));
  assert.doesNotThrow(() => validateNotificationRequest('email', { to: 'admin@hospital.com', message: 'ok' }));
});

test('notification request validation rejects invalid sms targets', () => {
  assert.throws(
    () => validateNotificationRequest('sms', { to: '1234', message: 'ok' }),
    (error) => error.statusCode === 400 && error.message === 'Invalid to: expected E.164 phone number'
  );
});

test('notification request validation rejects invalid email targets', () => {
  assert.throws(
    () => validateNotificationRequest('email', { to: 'not-an-email', message: 'ok' }),
    (error) => error.statusCode === 400 && error.message === 'Invalid to: expected email address'
  );
});

test('notification request validation keeps required field behavior', () => {
  assert.doesNotThrow(() => validateNotificationRequest('broadcast', { message: 'ok' }));
  assert.throws(
    () => validateNotificationRequest('sms', { message: 'ok' }),
    (error) => error.statusCode === 400 && error.message === 'Missing required fields: to'
  );
  assert.throws(
    () => validateNotificationRequest('email', { to: 'admin@hospital.com' }),
    (error) => error.statusCode === 400 && error.message === 'Missing required fields: message'
  );
  assert.throws(
    () => validateNotificationRequest('push', { message: 'ok' }),
    (error) => error.statusCode === 400 && error.message === 'Missing required fields: to'
  );
});
