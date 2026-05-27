const axios = require('axios');
const express = require('express');
const { createCircuitBreaker } = require('../../../../shared/middleware/circuitBreaker');

const services = [
  { name: 'matching', prefix: '/api/matching', url: process.env.MATCHING_SERVICE_URL || 'http://localhost:3001' },
  { name: 'inventory', prefix: '/api/inventory', url: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3002' },
  { name: 'notifications', prefix: '/api/notifications', url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003' },
  { name: 'analytics', prefix: '/api/analytics', url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3004' },
  { name: 'saga', prefix: '/api/saga', url: process.env.SAGA_SERVICE_URL || 'http://localhost:3005' }
];

function proxyTarget(req, prefix) {
  const pathWithoutQuery = req.originalUrl.split('?')[0];
  return pathWithoutQuery.slice(prefix.length) || '/';
}

function createServiceBreakers(config = {}) {
  return new Map(services.map((service) => [
    service.name,
    createCircuitBreaker({
      name: service.name,
      failureThreshold: config.circuitBreakerFailureThreshold,
      resetAfterMs: config.circuitBreakerResetAfterMs,
      logger: config.logger
    })
  ]));
}

function unavailable(res, serviceName) {
  const displayName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
  return res.status(503).json({
    success: false,
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: `${displayName} service temporarily unavailable`
    }
  });
}

function createProxyRouter(config = {}, breakers = createServiceBreakers(config), axiosClient = axios) {
  const router = express.Router();
  const serviceTimeoutMs = config.serviceTimeoutMs || 5000;

  router.use(async (req, res, next) => {
    const service = services.find((candidate) => req.originalUrl.startsWith(candidate.prefix));
    if (!service) return next();

    const targetPath = proxyTarget(req, service.prefix);
    const url = `${service.url}${targetPath}`;

    try {
      const result = await breakers.get(service.name).execute(async () => {
        const response = await axiosClient({
          method: req.method,
          url,
          data: req.body,
          params: req.query,
          timeout: serviceTimeoutMs,
          headers: {
            'X-Correlation-ID': req.correlationId,
            'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN,
            'x-request-id': req.header('x-request-id')
          },
          validateStatus: () => true
        });

        if (response.status >= 500) {
          throw Object.assign(new Error(`${service.name} service returned ${response.status}`), {
            statusCode: 503,
            code: 'SERVICE_UNAVAILABLE'
          });
        }

        return response;
      });
      return res.status(result.status).json(result.data);
    } catch (error) {
      if (error.statusCode === 503 || error.code === 'ECONNABORTED' || error.isAxiosError) {
        return unavailable(res, service.name);
      }
      return next(error);
    }
  });

  return router;
}

module.exports = { createProxyRouter, createServiceBreakers, proxyTarget, services };
