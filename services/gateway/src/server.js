require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');
const { createLogger } = require('../../../shared/utils/logger');
const { notFound, errorHandler } = require('../../../shared/middleware/errorHandler');
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

function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.use(limiter());
  app.get('/', (_req, res) => res.json({ success: true, data: gatewayInfo() }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'gateway' }));
  app.get('/ready', (_req, res) => res.json({ status: 'ready' }));
  app.use(auth);
  app.use(createProxyRouter());
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

async function start() {
  const app = createApp();
  const port = Number(process.env.GATEWAY_PORT) || 3000;
  app.listen(port, () => logger.info(`api-gateway listening on ${port}`));
}

if (require.main === module) {
  start().catch((error) => {
    logger.error({ err: error }, 'api-gateway failed to start');
    process.exit(1);
  });
}

module.exports = { createApp, gatewayInfo, start };
