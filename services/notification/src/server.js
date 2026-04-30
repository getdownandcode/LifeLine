require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const pinoHttp = require('pino-http');
const { createLogger } = require('../../../shared/utils/logger');
const { notFound, errorHandler } = require('../../../shared/middleware/errorHandler');
const { requireFields } = require('../../../shared/utils/validators');
const { ok, created } = require('../../../shared/utils/response');
const { sendNotification } = require('./services/notificationService');

const logger = createLogger('notification-service');
const logs = [];

function requiredNotificationFields(channel) {
  return channel === 'broadcast' ? ['message'] : ['to', 'message'];
}

async function start() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  if (process.env.MONGODB_URI) await mongoose.connect(process.env.MONGODB_URI, { minPoolSize: 5, maxPoolSize: 20 });

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

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'notification' }));
  app.get('/ready', (_req, res) => res.json({ status: 'ready' }));
  app.post('/sms', (req, res, next) => send('sms', req, res, next));
  app.post('/email', (req, res, next) => send('email', req, res, next));
  app.post('/push', (req, res, next) => send('push', req, res, next));
  app.post('/broadcast', (req, res, next) => send('broadcast', req, res, next));
  app.get('/logs/:recipientId', (req, res) => ok(res, logs.filter((log) => log.recipientId === req.params.recipientId)));
  app.use(notFound);
  app.use(errorHandler);

  const port = Number(process.env.NOTIFICATION_PORT) || 3003;
  app.listen(port, () => logger.info(`notification-service listening on ${port}`));
}

if (require.main === module) {
  start().catch((error) => {
    logger.error({ err: error }, 'notification-service failed to start');
    process.exit(1);
  });
}

module.exports = { requiredNotificationFields, start };
