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
const { buildController } = require('./controllers/inventoryController');
const { createPublisher } = require('./events/publisher');

const logger = createLogger('inventory-service');

async function start() {
  const config = validateConfig({ portEnv: 'INVENTORY_PORT', defaultPort: 3002 });
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(correlationIdMiddleware());
  app.use(pinoHttp({ logger, customProps: (req) => ({ correlationId: req.correlationId }) }));

  if (config.mongoUri) await mongoose.connect(config.mongoUri, { minPoolSize: 5, maxPoolSize: 20 });
  let publisher;
  if (config.rabbitmqUrl) {
    try {
      publisher = await createPublisher(config.rabbitmqUrl);
    } catch (error) {
      logger.warn({ err: error }, 'RabbitMQ unavailable; continuing without publishing');
    }
  }

  const controller = buildController({ publisher });
  const health = createHealthHandlers({
    service: 'inventory',
    mongodb: config.mongoUri ? mongoose.connection : undefined,
    rabbitmq: config.rabbitmqUrl ? publisher || false : undefined
  });
  app.get('/health', health.live);
  app.get('/ready', health.ready);
  app.get('/hospitals/:id/stock', controller.stock);
  app.post('/hospitals/:id/reserve', controller.reserve);
  app.put('/hospitals/:id/update', controller.update);
  app.get('/alerts/low-stock', controller.alerts);
  app.post('/transfer', controller.transfer);
  app.use(notFound);
  app.use(errorHandler);

  const shutdown = createShutdownHandler({ logger });
  if (config.mongoUri) shutdown.registerCleanup('mongodb', () => mongoose.disconnect());
  if (publisher?.close) shutdown.registerCleanup('rabbitmq', () => publisher.close());
  const server = app.listen(config.port, () => logger.info(`inventory-service listening on ${config.port}`));
  shutdown.registerServer(server);
  shutdown.start();
  return server;
}

if (require.main === module) {
  start().catch((error) => {
    logger.error({ err: error }, 'inventory-service failed to start');
    process.exit(1);
  });
}

module.exports = { start };
