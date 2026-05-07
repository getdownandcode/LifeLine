require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');
const { validateConfig } = require('../../../shared/config/validator');
const { createLogger } = require('../../../shared/utils/logger');
const { correlationIdMiddleware } = require('../../../shared/middleware/correlationId');
const { notFound, errorHandler } = require('../../../shared/middleware/errorHandler');
const { createHealthHandlers } = require('../../../shared/middleware/health');
const { createShutdownHandler } = require('../../../shared/middleware/shutdown');
const { ok, created } = require('../../../shared/utils/response');
const { nextSagaStep } = require('./services/sagaService');

const logger = createLogger('saga-service');
const sagas = new Map();

async function start() {
  const config = validateConfig({ portEnv: 'SAGA_PORT', defaultPort: 3005 });
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(correlationIdMiddleware());
  app.use(pinoHttp({ logger, customProps: (req) => ({ correlationId: req.correlationId }) }));

  const health = createHealthHandlers({ service: 'saga' });
  app.get('/health', health.live);
  app.get('/ready', health.ready);
  app.post('/events', (req, res) => {
    const step = nextSagaStep(req.body);
    const requestId = req.body.payload?.requestId || req.body.eventId;
    const history = sagas.get(requestId) || [];
    history.push(req.body);
    sagas.set(requestId, history);
    return created(res, { requestId, next: step, historyLength: history.length });
  });
  app.get('/sagas/:requestId', (req, res) => ok(res, sagas.get(req.params.requestId) || []));
  app.use(notFound);
  app.use(errorHandler);

  const shutdown = createShutdownHandler({ logger });
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
