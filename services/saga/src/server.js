require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');
const { createLogger } = require('../../../shared/utils/logger');
const { notFound, errorHandler } = require('../../../shared/middleware/errorHandler');
const { ok, created } = require('../../../shared/utils/response');
const { nextSagaStep } = require('./services/sagaService');

const logger = createLogger('saga-service');
const sagas = new Map();

async function start() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'saga' }));
  app.get('/ready', (_req, res) => res.json({ status: 'ready' }));
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

  const port = Number(process.env.SAGA_PORT) || 3005;
  app.listen(port, () => logger.info(`saga-service listening on ${port}`));
}

if (require.main === module) {
  start().catch((error) => {
    logger.error({ err: error }, 'saga-service failed to start');
    process.exit(1);
  });
}

module.exports = { start };
