const { randomUUID } = require('crypto');

const HEADER_NAME = 'X-Correlation-ID';

function correlationIdMiddleware() {
  return (req, res, next) => {
    const incomingId = req.header(HEADER_NAME) || req.header('X-Request-ID');
    req.correlationId = incomingId || randomUUID();
    res.setHeader(HEADER_NAME, req.correlationId);
    next();
  };
}

module.exports = { HEADER_NAME, correlationIdMiddleware };
