require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const pinoHttp = require('pino-http');
const { createLogger } = require('../../../shared/utils/logger');
const { notFound, errorHandler } = require('../../../shared/middleware/errorHandler');
const { buildController } = require('./controllers/matchingController');
const { EventPublisher } = require('./events/publisher');

const logger = createLogger('matching-service');

async function start() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  let redis;
  let publisher;

  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI, { minPoolSize: 5, maxPoolSize: 20 });
  }
  if (process.env.REDIS_URL) redis = new Redis(process.env.REDIS_URL);
  if (process.env.RABBITMQ_URL) {
    try {
      publisher = await EventPublisher.create(process.env.RABBITMQ_URL);
    } catch (error) {
      logger.warn({ err: error }, 'RabbitMQ unavailable; continuing without publishing');
    }
  }

  const controller = buildController({ redis, publisher });
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'matching' }));
  app.get('/ready', (_req, res) => res.json({ status: mongoose.connection.readyState === 1 ? 'ready' : 'degraded' }));
  app.post('/emergency', controller.createEmergency);
  app.get('/donors/nearby', controller.nearbyDonors);
  app.get('/compatibility/:type', controller.compatibility);
  app.post('/match/:requestId', controller.triggerMatch);
  app.get('/match/status/:id', controller.matchStatus);
  app.use(notFound);
  app.use(errorHandler);

  const port = Number(process.env.MATCHING_PORT) || 3001;
  app.listen(port, () => logger.info(`matching-service listening on ${port}`));
}

if (require.main === module) {
  start().catch((error) => {
    logger.error({ err: error }, 'matching-service failed to start');
    process.exit(1);
  });
}

module.exports = { start };
