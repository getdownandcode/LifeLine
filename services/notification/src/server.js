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
const { requireFields } = require('../../../shared/utils/validators');
const { ok, created } = require('../../../shared/utils/response');
const { sendNotification } = require('./services/notificationService');

const logger = createLogger('notification-service');
const logs = [];

function requiredNotificationFields(channel) {
  return channel === 'broadcast' ? ['message'] : ['to', 'message'];
}

async function start() {
  const config = validateConfig({ portEnv: 'NOTIFICATION_PORT', defaultPort: 3003 });
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(correlationIdMiddleware());
  app.use(pinoHttp({ logger, customProps: (req) => ({ correlationId: req.correlationId }) }));

  if (config.mongoUri) await mongoose.connect(config.mongoUri, { minPoolSize: 5, maxPoolSize: 20 });

  async function send(channel, req, res, next) {
    try {
      requireFields(req.body, requiredNotificationFields(channel));
      const result = await sendNotification({ channel, ...req.body });
      logs.push({ recipientId: req.body.recipientId, ...result });
      return created(res, result);
    } catch (error) {
      return next(error);
    }
  }

  const health = createHealthHandlers({ service: 'notification', mongodb: config.mongoUri ? mongoose.connection : undefined });
  app.get('/health', health.live);
  app.get('/ready', health.ready);
  app.post('/sms', (req, res, next) => send('sms', req, res, next));
  app.post('/email', (req, res, next) => send('email', req, res, next));
  app.post('/push', (req, res, next) => send('push', req, res, next));
  app.post('/broadcast', (req, res, next) => send('broadcast', req, res, next));
  app.get('/logs/:recipientId', (req, res) => ok(res, logs.filter((log) => log.recipientId === req.params.recipientId)));
  app.use(notFound);
  app.use(errorHandler);

  const shutdown = createShutdownHandler({ logger });
  if (config.mongoUri) shutdown.registerCleanup('mongodb', () => mongoose.disconnect());
  const server = app.listen(config.port, () => logger.info(`notification-service listening on ${config.port}`));
  shutdown.registerServer(server);
  shutdown.start();
  return server;
}

if (require.main === module) {
  start().catch((error) => {
    logger.error({ err: error }, 'notification-service failed to start');
    process.exit(1);
  });
}

module.exports = { requiredNotificationFields, start };
