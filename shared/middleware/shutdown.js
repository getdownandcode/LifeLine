function createShutdownHandler({ logger = console, timeoutMs = 10000 } = {}) {
  const cleanups = [];
  let server;
  let shuttingDown = false;

  function registerCleanup(name, cleanup) {
    cleanups.push({ name, cleanup });
  }

  function registerServer(httpServer) {
    server = httpServer;
  }

  async function run(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutdown started');

    const timeout = setTimeout(() => {
      logger.error({ timeoutMs }, 'shutdown timed out');
      process.exit(1);
    }, timeoutMs);

    try {
      if (server) {
        await new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }

      for (const { name, cleanup } of cleanups) {
        try {
          await cleanup();
          logger.info({ resource: name }, 'shutdown cleanup complete');
        } catch (error) {
          logger.warn({ err: error, resource: name }, 'shutdown cleanup failed');
        }
      }

      clearTimeout(timeout);
      process.exit(0);
    } catch (error) {
      clearTimeout(timeout);
      logger.error({ err: error }, 'shutdown failed');
      process.exit(1);
    }
  }

  function start() {
    process.once('SIGTERM', () => run('SIGTERM'));
    process.once('SIGINT', () => run('SIGINT'));
  }

  return { registerCleanup, registerServer, start };
}

module.exports = { createShutdownHandler };
