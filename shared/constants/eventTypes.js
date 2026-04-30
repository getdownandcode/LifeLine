const EVENTS = Object.freeze({
  EMERGENCY_CREATED: 'emergency.created',
  MATCH_REQUESTED: 'match.requested',
  MATCH_FOUND: 'match.found',
  MATCH_CONFIRMED: 'match.confirmed',
  MATCH_CANCELLED: 'match.cancelled',
  INVENTORY_RESERVE: 'inventory.reserve',
  INVENTORY_RESERVED: 'inventory.reserved',
  INVENTORY_FAILED: 'inventory.failed',
  INVENTORY_UPDATED: 'inventory.updated',
  NOTIFICATION_SEND: 'notification.send',
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',
  DONOR_REGISTERED: 'donor.registered'
});

const EXCHANGES = Object.freeze({
  DIRECT: 'events.direct',
  FANOUT: 'events.fanout',
  TOPIC: 'events.topic'
});

module.exports = { EVENTS, EXCHANGES };
