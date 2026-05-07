function formatMemory(bytes) {
  return `${Math.round(bytes / 1024 / 1024)}MB`;
}

function mongoStatus(connection) {
  if (!connection) return undefined;
  return connection.readyState === 1 ? 'connected' : 'disconnected';
}

function redisStatus(client) {
  if (!client) return undefined;
  return client.status === 'ready' ? 'connected' : client.status || 'disconnected';
}

function rabbitmqStatus(publisher) {
  if (publisher === false) return 'disconnected';
  if (!publisher) return undefined;
  if (typeof publisher.isConnected === 'function') return publisher.isConnected() ? 'connected' : 'disconnected';
  return 'connected';
}

function createHealthHandlers({ service, mongodb, redis, rabbitmq } = {}) {
  function live(req, res) {
    return res.json({
      status: 'ok',
      service,
      uptime: Math.round(process.uptime()),
      memory: formatMemory(process.memoryUsage().rss),
      correlationId: req.correlationId
    });
  }

  function ready(req, res) {
    const dependencies = {};
    const mongo = mongoStatus(mongodb);
    const redisState = redisStatus(redis);
    const rabbitState = rabbitmqStatus(rabbitmq);

    if (mongo) dependencies.mongodb = mongo;
    if (redisState) dependencies.redis = redisState;
    if (rabbitState) dependencies.rabbitmq = rabbitState;

    const ready = Object.values(dependencies).every((status) => status === 'connected');
    return res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'degraded',
      ready,
      service,
      dependencies,
      correlationId: req.correlationId
    });
  }

  return { live, ready };
}

module.exports = { createHealthHandlers };
