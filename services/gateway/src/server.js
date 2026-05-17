require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');
const { validateConfig } = require('../../../shared/config/validator');
const { createLogger } = require('../../../shared/utils/logger');
const { correlationIdMiddleware } = require('../../../shared/middleware/correlationId');
const { notFound, errorHandler } = require('../../../shared/middleware/errorHandler');
const { createHealthHandlers } = require('../../../shared/middleware/health');
const { createShutdownHandler } = require('../../../shared/middleware/shutdown');
const { auth } = require('./middleware/auth');
const { limiter } = require('./middleware/rateLimiter');
const { createProxyRouter } = require('./routes/proxy');

const logger = createLogger('api-gateway');

function gatewayInfo() {
  return {
    service: 'LifeLine API Gateway',
    status: 'ok',
    health: '/health',
    ready: '/ready',
    routes: [
      '/api/matching',
      '/api/inventory',
      '/api/notifications',
      '/api/analytics',
      '/api/saga'
    ],
    auth: 'API routes require an Authorization: Bearer <jwt> header'
  };
}

function createApp(config = {}) {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(correlationIdMiddleware());
  app.use(pinoHttp({ logger, customProps: (req) => ({ correlationId: req.correlationId }) }));

  const health = createHealthHandlers({ service: 'gateway' });
  app.use(limiter(config));
  app.get('/', (_req, res) => res.json({ success: true, data: gatewayInfo() }));
  app.get('/health', health.live);
  app.get('/ready', health.ready);
  app.use(auth);
  app.use(createProxyRouter());
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

async function start() {
  const config = validateConfig({ portEnv: 'GATEWAY_PORT', defaultPort: 3000, requireAuthSecrets: true });
  logger.info({
    rateLimitWindowMs: config.rateLimitWindowMs,
    rateLimitMaxRequests: config.rateLimitMaxRequests,
    rateLimitBypassInternalTokens: config.rateLimitBypassInternalTokens
  }, 'Rate limiter configured');
  const app = createApp(config);
  const shutdown = createShutdownHandler({ logger });
  const server = app.listen(config.port, () => logger.info(`api-gateway listening on ${config.port}`));
  shutdown.registerServer(server);
  shutdown.start();
  return server;
}

if (require.main === module) {
  start().catch((error) => {
    logger.error({ err: error }, 'api-gateway failed to start');
    process.exit(1);
  });
}

module.exports = { createApp, gatewayInfo, start };
