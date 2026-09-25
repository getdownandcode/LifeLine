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
const { internalAuth } = require('../../../shared/middleware/internalAuth');
const { ok, created, fail } = require('../../../shared/utils/response');
const { requireFields } = require('../../../shared/utils/validators');
const { nextSagaStep } = require('./services/sagaService');
const SagaStep = require('./models/SagaStep');

const logger = createLogger('saga-service');

function createSagaRouter({ model = SagaStep, nextStep = nextSagaStep } = {}) {
  const router = express.Router();

  router.post('/events', async (req, res, next) => {
    try {
      const body = req.body || {};
      requireFields(body, ['event']);
      const requestId = body.payload?.requestId || body.eventId;
      if (!requestId) {
        return fail(res, 400, 'requestId missing');
      }
      const sequence = await model.countDocuments({ requestId });
      await model.create({
        requestId,
        event: body.event,
        status: 'completed',
        payload: body.payload || {},
        sequence: sequence + 1
      });
      return created(res, { requestId, next: nextStep(body), historyLength: sequence + 1 });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/sagas/:requestId', async (req, res, next) => {
    try {
      const steps = await model.find({ requestId: req.params.requestId }).sort({ sequence: 1 });
      return ok(res, steps);
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

async function start() {
  const config = validateConfig({ portEnv: 'SAGA_PORT', defaultPort: 3005 });
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(correlationIdMiddleware());
  app.use(pinoHttp({ logger, customProps: (req) => ({ correlationId: req.correlationId }) }));

  if (config.mongoUri) {
    await mongoose.connect(config.mongoUri, {
      minPoolSize: config.mongoMinPoolSize,
      maxPoolSize: config.mongoMaxPoolSize
    });
  }

  const health = createHealthHandlers({
    service: 'saga',
    mongodb: config.mongoUri ? mongoose.connection : undefined
  });
  app.get('/health', health.live);
  app.get('/ready', health.ready);
  app.use(internalAuth);
  app.use(createSagaRouter({ model: SagaStep }));
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

module.exports = { createSagaRouter, start };
