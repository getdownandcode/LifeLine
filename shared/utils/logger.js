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
      level: process.env.LOG_LEVEL || 'info',
      base: { service }
    });
  }

  function write(level, args) {
    const [first, ...rest] = args;
    if (typeof first === 'object') {
      console[level]({ service, level, ...first }, ...rest);
      return;
    }
    console[level]({ service, level, message: first }, ...rest);
  }

  return {
    info: (...args) => write('log', args),
    warn: (...args) => write('warn', args),
    error: (...args) => write('error', args),
    debug: (...args) => write('debug', args)
  };
}

module.exports = { createLogger };
