require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const pinoHttp = require('pino-http');
const { validateConfig } = require('../../../shared/config/validator');
const { createLogger } = require('../../../shared/utils/logger');
const { correlationIdMiddleware } = require('../../../shared/middleware/correlationId');
const { notFound, errorHandler } = require('../../../shared/middleware/errorHandler');
const { createHealthHandlers } = require('../../../shared/middleware/health');
const { createShutdownHandler } = require('../../../shared/middleware/shutdown');
const { buildController } = require('./controllers/matchingController');
const { EventPublisher } = require('./events/publisher');

const logger = createLogger('matching-service');

async function start() {
  const config = validateConfig({ portEnv: 'MATCHING_PORT', defaultPort: 3001 });
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(correlationIdMiddleware());
  app.use(pinoHttp({ logger, customProps: (req) => ({ correlationId: req.correlationId }) }));

  let redis;
  let publisher;

  if (config.mongoUri) {
    await mongoose.connect(config.mongoUri, { minPoolSize: 5, maxPoolSize: 20 });
  }
  if (config.redisUrl) redis = new Redis(config.redisUrl);
  if (config.rabbitmqUrl) {
    try {
      publisher = await EventPublisher.create(config.rabbitmqUrl);
    } catch (error) {
      logger.warn({ err: error }, 'RabbitMQ unavailable; continuing without publishing');
    }
  }

  const controller = buildController({ redis, publisher });
  const health = createHealthHandlers({
    service: 'matching',
    mongodb: config.mongoUri ? mongoose.connection : undefined,
    redis,
    rabbitmq: config.rabbitmqUrl ? publisher || false : undefined
  });
  app.get('/health', health.live);
  app.get('/ready', health.ready);
  app.post('/emergency', controller.createEmergency);
  app.get('/donors/nearby', controller.nearbyDonors);
  app.get('/compatibility/:type', controller.compatibility);
  app.post('/match/:requestId', controller.triggerMatch);
  app.get('/match/status/:id', controller.matchStatus);
  app.use(notFound);
  app.use(errorHandler);

  const shutdown = createShutdownHandler({ logger });
  if (config.mongoUri) shutdown.registerCleanup('mongodb', () => mongoose.disconnect());
  if (redis) shutdown.registerCleanup('redis', () => redis.quit());
  if (publisher?.close) shutdown.registerCleanup('rabbitmq', () => publisher.close());
  const server = app.listen(config.port, () => logger.info(`matching-service listening on ${config.port}`));
  shutdown.registerServer(server);
  shutdown.start();
  return server;
}

if (require.main === module) {
  start().catch((error) => {
    logger.error({ err: error }, 'matching-service failed to start');
    process.exit(1);
  });
}

module.exports = { start };
