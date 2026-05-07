const axios = require('axios');
const express = require('express');
const { circuitBreaker } = require('../../../../shared/middleware/circuitBreaker');

const serviceMap = {
  '/api/matching': process.env.MATCHING_SERVICE_URL || 'http://localhost:3001',
  '/api/inventory': process.env.INVENTORY_SERVICE_URL || 'http://localhost:3002',
  '/api/notifications': process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003',
  '/api/analytics': process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3004',
  '/api/saga': process.env.SAGA_SERVICE_URL || 'http://localhost:3005'
};

function proxyTarget(req, prefix) {
  const pathWithoutQuery = req.originalUrl.split('?')[0];
  return pathWithoutQuery.slice(prefix.length) || '/';
}

function createProxyRouter() {
  const router = express.Router();
  const breakers = new Map(Object.keys(serviceMap).map((prefix) => [prefix, circuitBreaker()]));

  router.use(async (req, res, next) => {
    const prefix = Object.keys(serviceMap).find((candidate) => req.originalUrl.startsWith(candidate));
    if (!prefix) return next();

    const targetPath = proxyTarget(req, prefix);
    const url = `${serviceMap[prefix]}${targetPath}`;

    try {
      const result = await breakers.get(prefix)(() => axios({
        method: req.method,
        url,
        data: req.body,
        params: req.query,
        headers: {
          'X-Correlation-ID': req.correlationId,
          'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN,
          'x-request-id': req.header('x-request-id')
        },
        validateStatus: () => true
      }));
      return res.status(result.status).json(result.data);
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createProxyRouter, proxyTarget };
