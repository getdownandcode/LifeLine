require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const pinoHttp = require('pino-http');
const { createLogger } = require('../../../shared/utils/logger');
const { notFound, errorHandler } = require('../../../shared/middleware/errorHandler');
const { ok, created } = require('../../../shared/utils/response');
const { summarizeEvents } = require('./services/metricsService');

const logger = createLogger('analytics-service');
const events = [];

async function start() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  if (process.env.MONGODB_URI) await mongoose.connect(process.env.MONGODB_URI, { minPoolSize: 5, maxPoolSize: 20 });

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'analytics' }));
  app.get('/ready', (_req, res) => res.json({ status: 'ready' }));
  app.post('/events', (req, res) => {
    const event = { ...req.body, timestamp: req.body.timestamp || new Date().toISOString() };
    events.push(event);
    return created(res, event);
  });
  app.get('/metrics', (_req, res) => ok(res, summarizeEvents(events)));
  app.use(notFound);
  app.use(errorHandler);

  const port = Number(process.env.ANALYTICS_PORT) || 3004;
  app.listen(port, () => logger.info(`analytics-service listening on ${port}`));
}

if (require.main === module) {
  start().catch((error) => {
    logger.error({ err: error }, 'analytics-service failed to start');
    process.exit(1);
  });
}

module.exports = { start };
