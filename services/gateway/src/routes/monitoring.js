const express = require('express');
const { ok } = require('../../../../shared/utils/response');

function createMonitoringRouter(breakers) {
  const router = express.Router();

  router.get('/api/gateway/circuit-breakers', (_req, res) => {
    const metrics = {};
    for (const [name, breaker] of breakers.entries()) {
      metrics[name] = breaker.getMetrics();
    }
    return ok(res, metrics);
  });

  return router;
}

module.exports = { createMonitoringRouter };
