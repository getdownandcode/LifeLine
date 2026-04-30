const test = require('node:test');
const assert = require('node:assert/strict');
const { requiredNotificationFields } = require('../../services/notification/src/server');

test('broadcast notifications only require a message', () => {
  assert.deepEqual(requiredNotificationFields('broadcast'), ['message']);
});

test('direct notifications require a target and message', () => {
  assert.deepEqual(requiredNotificationFields('sms'), ['to', 'message']);
  assert.deepEqual(requiredNotificationFields('email'), ['to', 'message']);
  assert.deepEqual(requiredNotificationFields('push'), ['to', 'message']);
});
