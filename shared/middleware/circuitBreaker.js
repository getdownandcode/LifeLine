function circuitBreaker({ failureThreshold = 5, resetAfterMs = 30000 } = {}) {
  let failures = 0;
  let openedAt = 0;

  return async function run(operation) {
    if (openedAt && Date.now() - openedAt < resetAfterMs) {
      const error = new Error('Circuit breaker is open');
      error.statusCode = 503;
      throw error;
    }

    if (openedAt && Date.now() - openedAt >= resetAfterMs) {
      failures = 0;
      openedAt = 0;
    }

    try {
      const result = await operation();
      failures = 0;
      return result;
    } catch (error) {
      failures += 1;
      if (failures >= failureThreshold) openedAt = Date.now();
      throw error;
    }
  };
}

module.exports = { circuitBreaker };
