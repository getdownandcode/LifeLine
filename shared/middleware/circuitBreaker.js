const CLOSED = 'closed';
const OPEN = 'open';
const HALF_OPEN = 'half-open';

function serviceUnavailable(name) {
  const error = new Error(`${name} service temporarily unavailable`);
  error.statusCode = 503;
  error.code = 'SERVICE_UNAVAILABLE';
  return error;
}

function createCircuitBreaker({ name, failureThreshold = 5, resetAfterMs = 30000, logger } = {}) {
  let state = CLOSED;
  let failures = 0;
  let successes = 0;
  let rejected = 0;
  let openedCount = 0;
  let lastFailureAt;
  let lastOpenedAt;
  let halfOpenInFlight = false;

  function log(message) {
    if (logger?.warn) logger.warn(message);
  }

  function setState(nextState) {
    if (state === nextState) return;
    state = nextState;

    if (nextState === OPEN) {
      openedCount += 1;
      lastOpenedAt = Date.now();
      log(`[CircuitBreaker] ${name} OPEN after ${failures} failures`);
    } else if (nextState === HALF_OPEN) {
      failures = 0;
      log(`[CircuitBreaker] ${name} HALF_OPEN`);
    } else if (nextState === CLOSED) {
      log(`[CircuitBreaker] ${name} CLOSED`);
    }
  }

  function rejectRequest() {
    rejected += 1;
    throw serviceUnavailable(name);
  }

  function onSuccess() {
    successes += 1;
    failures = 0;
    halfOpenInFlight = false;
    setState(CLOSED);
  }

  function onFailure() {
    failures += 1;
    lastFailureAt = Date.now();
    halfOpenInFlight = false;
    if (state === HALF_OPEN || failures >= failureThreshold) setState(OPEN);
  }

  async function execute(operation) {
    if (state === OPEN) {
      if (Date.now() - lastOpenedAt < resetAfterMs) rejectRequest();
      setState(HALF_OPEN);
    }

    if (state === HALF_OPEN) {
      if (halfOpenInFlight) rejectRequest();
      halfOpenInFlight = true;
    }

    try {
      const result = await operation();
      onSuccess();
      return result;
    } catch (error) {
      onFailure();
      throw error;
    }
  }

  function getState() {
    return state;
  }

  function getMetrics() {
    return {
      name,
      state,
      failures,
      successes,
      rejected,
      openedCount,
      lastFailureAt,
      lastOpenedAt,
      halfOpenInFlight
    };
  }

  return { execute, getState, getMetrics };
}

module.exports = { createCircuitBreaker };
