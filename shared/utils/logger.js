let pino;

try {
  pino = require('pino');
} catch (_error) {
  pino = null;
}

function createLogger(service = 'lifeline') {
  if (pino) {
    return pino({
      name: service,
      level: process.env.LOG_LEVEL || 'info'
    });
  }

  return {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };
}

module.exports = { createLogger };
