require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const pinoHttp = require('pino-http');
const { validateConfig } = require('../../../shared/config/validator');
const { createLogger } = require('../../../shared/utils/logger');
const { correlationIdMiddleware } = require('../../../shared/middleware/correlationId');
const { notFound, errorHandler } = require('../../../shared/middleware/errorHandler');
const { createHealthHandlers } = require('../../../shared/middleware/health');
const { createShutdownHandler } = require('../../../shared/middleware/shutdown');
const { ok, created } = require('../../../shared/utils/response');
const { summarizeEvents } = require('./services/metricsService');

const logger = createLogger('analytics-service');
const events = [];

async function start() {
  const config = validateConfig({ portEnv: 'ANALYTICS_PORT', defaultPort: 3004 });
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(correlationIdMiddleware());
  app.use(pinoHttp({ logger, customProps: (req) => ({ correlationId: req.correlationId }) }));

  if (config.mongoUri) await mongoose.connect(config.mongoUri, { minPoolSize: 5, maxPoolSize: 20 });

  const health = createHealthHandlers({ service: 'analytics', mongodb: config.mongoUri ? mongoose.connection : undefined });
  app.get('/health', health.live);
  app.get('/ready', health.ready);
  app.post('/events', (req, res) => {
    const event = { ...req.body, timestamp: req.body.timestamp || new Date().toISOString() };
    events.push(event);
    return created(res, event);
  });
  app.get('/metrics', (_req, res) => ok(res, summarizeEvents(events)));
  app.use(notFound);
  app.use(errorHandler);

  const shutdown = createShutdownHandler({ logger });
  if (config.mongoUri) shutdown.registerCleanup('mongodb', () => mongoose.disconnect());
  const server = app.listen(config.port, () => logger.info(`analytics-service listening on ${config.port}`));
  shutdown.registerServer(server);
  shutdown.start();
  return server;
}

if (require.main === module) {
  start().catch((error) => {
    logger.error({ err: error }, 'analytics-service failed to start');
    process.exit(1);
  });
}

module.exports = { start };
