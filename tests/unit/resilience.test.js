const test = require('node:test');
const assert = require('node:assert/strict');
const { validateConfig } = require('../../shared/config/validator');
const { correlationIdMiddleware } = require('../../shared/middleware/correlationId');
const { createCircuitBreaker } = require('../../shared/middleware/circuitBreaker');
const { createHealthHandlers } = require('../../shared/middleware/health');

function withEnv(values, run) {
  const previous = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }

  try {
    return run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('config validation rejects invalid service ports', () => {
  withEnv({ TEST_PORT: 'invalid' }, () => {
    assert.throws(
      () => validateConfig({ portEnv: 'TEST_PORT', defaultPort: 3000 }),
      /TEST_PORT must be a valid number/
    );
  });
});

test('config validation requires production gateway secrets', () => {
  withEnv({ NODE_ENV: 'production', JWT_SECRET: undefined, INTERNAL_SERVICE_TOKEN: 'token' }, () => {
    assert.throws(
      () => validateConfig({ portEnv: 'TEST_PORT', defaultPort: 3000, requireAuthSecrets: true }),
      /JWT_SECRET is required in production/
    );
  });
});

test('config validation keeps existing short secrets compatible unless strict validation is enabled', () => {
  withEnv({ NODE_ENV: 'production', JWT_SECRET: 'change_me_dev_secret', INTERNAL_SERVICE_TOKEN: 'change_me_internal_token' }, () => {
    const config = validateConfig({ portEnv: 'TEST_PORT', defaultPort: 3000, requireAuthSecrets: true });

    assert.equal(config.jwtSecret, 'change_me_dev_secret');
  });
});

test('config validation enforces secret length in strict mode', () => {
  withEnv({ NODE_ENV: 'production', JWT_SECRET: 'short', INTERNAL_SERVICE_TOKEN: 'token', STRICT_SECRET_VALIDATION: 'true' }, () => {
    assert.throws(
      () => validateConfig({ portEnv: 'TEST_PORT', defaultPort: 3000, requireAuthSecrets: true }),
      /STRICT_SECRET_VALIDATION=true/
    );
  });
});

test('health responses preserve and return correlation id', () => {
  const { live } = createHealthHandlers({ service: 'gateway' });
  const headers = {};
  const req = {
    correlationId: undefined,
    header(name) {
      return name.toLowerCase() === 'x-correlation-id' ? 'test-123' : undefined;
    }
  };
  const res = {
    body: undefined,
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };

  correlationIdMiddleware()(req, res, () => live(req, res));

  assert.equal(headers['x-correlation-id'], 'test-123');
  assert.equal(res.body.correlationId, 'test-123');
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.service, 'gateway');
});

test('ready health reports configured RabbitMQ failure', () => {
  const { ready } = createHealthHandlers({ service: 'inventory', rabbitmq: false });
  const req = { correlationId: 'ready-1' };
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };

  ready(req, res);

  assert.equal(res.statusCode, 503);
  assert.equal(res.body.ready, false);
  assert.equal(res.body.dependencies.rabbitmq, 'disconnected');
});

test('circuit breaker opens after threshold failures and rejects while open', async () => {
  const breaker = createCircuitBreaker({ name: 'inventory', failureThreshold: 2, resetAfterMs: 1000 });

  await assert.rejects(() => breaker.execute(async () => {
    throw new Error('down');
  }), /down/);
  assert.equal(breaker.getState(), 'closed');

  await assert.rejects(() => breaker.execute(async () => {
    throw new Error('still down');
  }), /still down/);
  assert.equal(breaker.getState(), 'open');

  await assert.rejects(
    () => breaker.execute(async () => 'ok'),
    (error) => error.statusCode === 503 && error.code === 'SERVICE_UNAVAILABLE'
  );
  assert.equal(breaker.getMetrics().rejected, 1);
});

test('circuit breaker closes after successful half-open probe', async () => {
  const breaker = createCircuitBreaker({ name: 'matching', failureThreshold: 1, resetAfterMs: 1 });

  await assert.rejects(() => breaker.execute(async () => {
    throw new Error('down');
  }));
  await new Promise((resolve) => setTimeout(resolve, 2));

  const result = await breaker.execute(async () => 'recovered');

  assert.equal(result, 'recovered');
  assert.equal(breaker.getState(), 'closed');
  assert.equal(breaker.getMetrics().failures, 0);
});

test('circuit breaker allows only one half-open probe and reopens on probe failure', async () => {
  const breaker = createCircuitBreaker({ name: 'analytics', failureThreshold: 1, resetAfterMs: 1 });
  let releaseProbe;
  const probe = new Promise((resolve) => {
    releaseProbe = resolve;
  });

  await assert.rejects(() => breaker.execute(async () => {
    throw new Error('down');
  }));
  await new Promise((resolve) => setTimeout(resolve, 2));

  const firstProbe = breaker.execute(async () => probe);
  await assert.rejects(
    () => breaker.execute(async () => 'second probe'),
    (error) => error.statusCode === 503 && error.code === 'SERVICE_UNAVAILABLE'
  );
  releaseProbe('ok');
  await firstProbe;

  await assert.rejects(() => breaker.execute(async () => {
    throw new Error('down again');
  }));
  await new Promise((resolve) => setTimeout(resolve, 2));
  await assert.rejects(() => breaker.execute(async () => {
    throw new Error('probe failed');
  }), /probe failed/);

  assert.equal(breaker.getState(), 'open');
});

test('circuit breaker metrics reflect current state and counters', async () => {
  const breaker = createCircuitBreaker({ name: 'saga', failureThreshold: 1, resetAfterMs: 1000 });

  await breaker.execute(async () => 'ok');
  await assert.rejects(() => breaker.execute(async () => {
    throw new Error('down');
  }));

  const metrics = breaker.getMetrics();
  assert.equal(metrics.name, 'saga');
  assert.equal(metrics.state, 'open');
  assert.equal(metrics.successes, 1);
  assert.equal(metrics.failures, 1);
  assert.equal(metrics.openedCount, 1);
  assert.ok(metrics.lastFailureAt);
  assert.ok(metrics.lastOpenedAt);
});
