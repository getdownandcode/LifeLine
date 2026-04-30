const { EVENTS } = require('../../../../shared/constants/eventTypes');

function nextSagaStep(event) {
  switch (event.event) {
    case EVENTS.EMERGENCY_CREATED:
      return { event: EVENTS.MATCH_REQUESTED, payload: event.payload };
    case EVENTS.MATCH_FOUND:
      return { event: EVENTS.INVENTORY_RESERVE, payload: event.payload };
    case EVENTS.INVENTORY_RESERVED:
      return { event: EVENTS.NOTIFICATION_SEND, payload: event.payload };
    case EVENTS.NOTIFICATION_SENT:
      return { event: EVENTS.MATCH_CONFIRMED, payload: event.payload };
    case EVENTS.INVENTORY_FAILED:
      return { event: EVENTS.MATCH_CANCELLED, payload: event.payload };
    default:
      return null;
  }
}

module.exports = { nextSagaStep };
