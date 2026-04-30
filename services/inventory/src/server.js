require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const pinoHttp = require('pino-http');
const { createLogger } = require('../../../shared/utils/logger');
const { notFound, errorHandler } = require('../../../shared/middleware/errorHandler');
const { buildController } = require('./controllers/inventoryController');
const { createPublisher } = require('./events/publisher');

const logger = createLogger('inventory-service');

async function start() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  if (process.env.MONGODB_URI) await mongoose.connect(process.env.MONGODB_URI, { minPoolSize: 5, maxPoolSize: 20 });
  let publisher;
  if (process.env.RABBITMQ_URL) {
    try {
      publisher = await createPublisher(process.env.RABBITMQ_URL);
    } catch (error) {
      logger.warn({ err: error }, 'RabbitMQ unavailable; continuing without publishing');
    }
  }

  const controller = buildController({ publisher });
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'inventory' }));
  app.get('/ready', (_req, res) => res.json({ status: mongoose.connection.readyState === 1 ? 'ready' : 'degraded' }));
  app.get('/hospitals/:id/stock', controller.stock);
  app.post('/hospitals/:id/reserve', controller.reserve);
  app.put('/hospitals/:id/update', controller.update);
  app.get('/alerts/low-stock', controller.alerts);
  app.post('/transfer', controller.transfer);
  app.use(notFound);
  app.use(errorHandler);

  const port = Number(process.env.INVENTORY_PORT) || 3002;
  app.listen(port, () => logger.info(`inventory-service listening on ${port}`));
}

if (require.main === module) {
  start().catch((error) => {
    logger.error({ err: error }, 'inventory-service failed to start');
    process.exit(1);
  });
}

module.exports = { start };
