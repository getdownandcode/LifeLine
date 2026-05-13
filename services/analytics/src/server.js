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
const { getMetricsFromDb } = require('./services/metricsService');
const EventLog = require('./models/EventLog');

const logger = createLogger('analytics-service');

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
  app.post('/events', async (req, res) => {
    try {
      // Skip persistence if MongoDB not configured
      if (!config.mongoUri) {
        logger.warn('MongoDB not configured, skipping event persistence');
        return created(res, { ...req.body, timestamp: req.body.timestamp || new Date().toISOString() });
      }

      const event = {
        eventId: req.body.eventId || `${Date.now()}-${Math.random()}`,
        event: req.body.event,
        correlationId: req.correlationId || req.body.correlationId,
        payload: req.body.payload,
        timestamp: req.body.timestamp || new Date().toISOString()
      };

      // Persist to MongoDB
      const savedEvent = await EventLog.create(event);
      logger.info({ eventId: savedEvent._id, event: event.event, correlationId: event.correlationId }, 'event persisted');
      
      return created(res, savedEvent.toObject());
    } catch (error) {
      logger.error({ err: error, body: req.body }, 'failed to persist event');
      return res.status(500).json({ error: 'failed to persist event', message: error.message });
    }
  });
  app.get('/metrics', async (_req, res) => {
    try {
      // Query metrics from database
      if (!config.mongoUri) {
        logger.warn('MongoDB not configured, returning empty metrics');
        return ok(res, { total: 0, byEvent: {} });
      }

      const metrics = await getMetricsFromDb(EventLog, { hoursBack: 24 });
      return ok(res, metrics);
    } catch (error) {
      logger.error({ err: error }, 'failed to fetch metrics');
      return res.status(500).json({ error: 'failed to fetch metrics', message: error.message });
    }
  });
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
