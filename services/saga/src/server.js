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
const { nextSagaStep } = require('./services/sagaService');
const SagaStep = require('./models/SagaStep');

const logger = createLogger('saga-service');

async function start() {
  const config = validateConfig({ portEnv: 'SAGA_PORT', defaultPort: 3005 });
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(correlationIdMiddleware());
  app.use(pinoHttp({ logger, customProps: (req) => ({ correlationId: req.correlationId }) }));

  if (config.mongoUri) await mongoose.connect(config.mongoUri, { minPoolSize: 5, maxPoolSize: 20 });

  const health = createHealthHandlers({
    service: 'saga',
    mongodb: config.mongoUri ? mongoose.connection : undefined
  });
  app.get('/health', health.live);
  app.get('/ready', health.ready);
  app.post('/events', async (req, res) => {
    const step = nextSagaStep(req.body);
    const requestId = req.body.payload?.requestId || req.body.eventId;
    if (!requestId) {
      return res.status(400).json({ error: 'requestId missing' });
    }
    const sequence = await SagaStep.countDocuments({ requestId });
    await SagaStep.create({
      requestId,
      event: req.body.event,
      status: 'completed',
      payload: req.body.payload || {},
      sequence: sequence + 1
    });
    return created(res, { requestId, next: step, historyLength: sequence + 1 });
  });
  app.get('/sagas/:requestId', async (req, res) => {
    const steps = await SagaStep.find({ requestId: req.params.requestId }).sort({ sequence: 1 });
    return ok(res, steps);
  });
  app.use(notFound);
  app.use(errorHandler);

  const shutdown = createShutdownHandler({ logger });
  if (config.mongoUri) shutdown.registerCleanup('mongodb', () => mongoose.disconnect());
  const server = app.listen(config.port, () => logger.info(`saga-service listening on ${config.port}`));
  shutdown.registerServer(server);
  shutdown.start();
  return server;
}

if (require.main === module) {
  start().catch((error) => {
    logger.error({ err: error }, 'saga-service failed to start');
    process.exit(1);
  });
}

module.exports = { start };
