const test = require('node:test');
const assert = require('node:assert/strict');
const { gatewayInfo } = require('../../services/gateway/src/server');
const { auth } = require('../../services/gateway/src/middleware/auth');
const { createProxyRouter, createServiceBreakers, proxyTarget } = require('../../services/gateway/src/routes/proxy');
const { createMonitoringRouter } = require('../../services/gateway/src/routes/monitoring');
const { readPositiveInt, readBoolean, validateConfig } = require('../../shared/config/validator');
const { limiter } = require('../../services/gateway/src/middleware/rateLimiter');

function invokeRouter(router, { method = 'GET', path, query = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = {
      method,
      url: path,
      originalUrl: path,
      query,
      body,
      correlationId: 'test-correlation-id',
      header: () => undefined
    };
    const res = {
      statusCode: 200,
      body: undefined,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        resolve(this);
        return this;
      }
    };
    router.handle(req, res, (error) => {
      if (error) reject(error);
      else resolve(res);
    });
  });
}

test('gateway root info describes available public and API routes', () => {
  const info = gatewayInfo();

  assert.equal(info.service, 'LifeLine API Gateway');
  assert.equal(info.health, '/health');
  assert.ok(info.routes.includes('/api/matching'));
  assert.match(info.auth, /Authorization: Bearer <jwt>/);
});

test('gateway API routes require bearer auth by default', () => {
  const previousRequireAuth = process.env.REQUIRE_AUTH;
  delete process.env.REQUIRE_AUTH;

  const req = {
    path: '/api/matching',
    header: () => ''
  };
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

  try {
    auth(req, res, () => assert.fail('auth should reject missing bearer tokens'));

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.message, 'Missing bearer token');
  } finally {
    if (previousRequireAuth !== undefined) process.env.REQUIRE_AUTH = previousRequireAuth;
  }
});

test('gateway auth only bypasses when explicitly disabled via REQUIRE_AUTH=0', () => {
  const previousRequireAuth = process.env.REQUIRE_AUTH;
  process.env.REQUIRE_AUTH = '0';

  try {
    let called = false;
    auth({ path: '/api/matching', header: () => '' }, {}, () => {
      called = true;
    });
    assert.equal(called, true);
  } finally {
    if (previousRequireAuth === undefined) delete process.env.REQUIRE_AUTH;
    else process.env.REQUIRE_AUTH = previousRequireAuth;
  }
});

test('gateway auth keeps health and readiness endpoints public', () => {
  for (const path of ['/health', '/ready']) {
    let called = false;
    auth({ path, header: () => '' }, {}, () => {
      called = true;
    });
    assert.equal(called, true);
  }
});

test('gateway auth accepts a valid bearer token and attaches the payload', () => {
  const jwt = require('jsonwebtoken');
  const previousSecret = process.env.JWT_SECRET;
  const previousRequireAuth = process.env.REQUIRE_AUTH;
  process.env.JWT_SECRET = 'test_secret_that_is_at_least_32_chars';
  delete process.env.REQUIRE_AUTH;

  try {
    const token = jwt.sign({ sub: 'cli', role: 'admin' }, process.env.JWT_SECRET);
    const req = {
      path: '/api/matching',
      header: (name) => (name === 'authorization' ? `Bearer ${token}` : undefined)
    };

    let called = false;
    auth(req, {}, () => {
      called = true;
    });

    assert.equal(called, true);
    assert.equal(req.user.sub, 'cli');
    assert.equal(req.user.role, 'admin');
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    if (previousRequireAuth === undefined) delete process.env.REQUIRE_AUTH;
    else process.env.REQUIRE_AUTH = previousRequireAuth;
  }
});

test('gateway auth rejects tampered bearer tokens', () => {
  const previousRequireAuth = process.env.REQUIRE_AUTH;
  delete process.env.REQUIRE_AUTH;

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

  try {
    auth(
      { path: '/api/matching', header: (name) => (name === 'authorization' ? 'Bearer not-a-jwt' : undefined) },
      res,
      () => assert.fail('auth should reject invalid bearer tokens')
    );

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error.message, 'Invalid bearer token');
  } finally {
    if (previousRequireAuth !== undefined) process.env.REQUIRE_AUTH = previousRequireAuth;
  }
});

test('gateway proxy strips query string before forwarding params', () => {
  assert.equal(
    proxyTarget({ originalUrl: '/api/matching/donors/nearby?bloodType=A%2B&bloodType=A%2B' }, '/api/matching'),
    '/donors/nearby'
  );
});

test('readPositiveInt returns default when env is unset', () => {
  assert.equal(readPositiveInt('UNSET_VAR_12345', 900000), 900000);
  assert.equal(readPositiveInt('UNSET_VAR_12345', 100), 100);
});

test('readPositiveInt returns value when env is valid', () => {
  process.env.TEST_VALID_INT = '500';
  try {
    assert.equal(readPositiveInt('TEST_VALID_INT', 100), 500);
  } finally {
    delete process.env.TEST_VALID_INT;
  }
});

test('readPositiveInt rejects negative numbers', () => {
  process.env.TEST_NEG_INT = '-1';
  try {
    assert.throws(() => readPositiveInt('TEST_NEG_INT', 100), /must be a positive integer/);
  } finally {
    delete process.env.TEST_NEG_INT;
  }
});

test('readPositiveInt rejects zero', () => {
  process.env.TEST_ZERO = '0';
  try {
    assert.throws(() => readPositiveInt('TEST_ZERO', 100), /must be a positive integer/);
  } finally {
    delete process.env.TEST_ZERO;
  }
});

test('readPositiveInt rejects non-numeric strings', () => {
  process.env.TEST_NAN = 'abc';
  try {
    assert.throws(() => readPositiveInt('TEST_NAN', 100), /must be a positive integer/);
  } finally {
    delete process.env.TEST_NAN;
  }
});

test('readPositiveInt rejects float values', () => {
  process.env.TEST_FLOAT = '12.5';
  try {
    assert.throws(() => readPositiveInt('TEST_FLOAT', 100), /must be a positive integer/);
  } finally {
    delete process.env.TEST_FLOAT;
  }
});

test('readBoolean returns default when env is unset', () => {
  assert.equal(readBoolean('UNSET_BOOL_12345', true), true);
  assert.equal(readBoolean('UNSET_BOOL_12345', false), false);
});

test('readBoolean returns true for "true"', () => {
  process.env.TEST_BOOL_TRUE = 'true';
  try {
    assert.equal(readBoolean('TEST_BOOL_TRUE', false), true);
  } finally {
    delete process.env.TEST_BOOL_TRUE;
  }
});

test('readBoolean returns false for "false"', () => {
  process.env.TEST_BOOL_FALSE = 'false';
  try {
    assert.equal(readBoolean('TEST_BOOL_FALSE', true), false);
  } finally {
    delete process.env.TEST_BOOL_FALSE;
  }
});

test('readBoolean rejects malformed boolean values', () => {
  for (const bad of ['yes', '1', 'TRUE', 'True', 'abc']) {
    process.env.TEST_BAD_BOOL = bad;
    try {
      assert.throws(() => readBoolean('TEST_BAD_BOOL', true), /must be 'true' or 'false'/);
    } finally {
      delete process.env.TEST_BAD_BOOL;
    }
  }
});

test('validateConfig returns rate limit defaults when envs are unset', () => {
  const previousMinPoolSize = process.env.MONGO_MIN_POOL_SIZE;
  const previousMaxPoolSize = process.env.MONGO_MAX_POOL_SIZE;
  delete process.env.MONGO_MIN_POOL_SIZE;
  delete process.env.MONGO_MAX_POOL_SIZE;
  try {
    const config = validateConfig();
    assert.equal(config.mongoMinPoolSize, 5);
    assert.equal(config.mongoMaxPoolSize, 20);
    assert.equal(config.rateLimitWindowMs, 900000);
    assert.equal(config.rateLimitMaxRequests, 100);
    assert.equal(config.rateLimitBypassInternalTokens, true);
    assert.equal(config.circuitBreakerFailureThreshold, 5);
    assert.equal(config.circuitBreakerResetAfterMs, 30000);
    assert.equal(config.serviceTimeoutMs, 5000);
  } finally {
    if (previousMinPoolSize === undefined) delete process.env.MONGO_MIN_POOL_SIZE;
    else process.env.MONGO_MIN_POOL_SIZE = previousMinPoolSize;
    if (previousMaxPoolSize === undefined) delete process.env.MONGO_MAX_POOL_SIZE;
    else process.env.MONGO_MAX_POOL_SIZE = previousMaxPoolSize;
  }
});

test('validateConfig reads rate limit env vars', () => {
  process.env.RATE_LIMIT_WINDOW_MS = '60000';
  process.env.RATE_LIMIT_MAX_REQUESTS = '200';
  process.env.RATE_LIMIT_BYPASS_INTERNAL_TOKENS = 'false';
  process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD = '3';
  process.env.CIRCUIT_BREAKER_RESET_AFTER_MS = '10000';
  process.env.SERVICE_TIMEOUT_MS = '2500';
  try {
    const config = validateConfig();
    assert.equal(config.rateLimitWindowMs, 60000);
    assert.equal(config.rateLimitMaxRequests, 200);
    assert.equal(config.rateLimitBypassInternalTokens, false);
    assert.equal(config.circuitBreakerFailureThreshold, 3);
    assert.equal(config.circuitBreakerResetAfterMs, 10000);
    assert.equal(config.serviceTimeoutMs, 2500);
  } finally {
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX_REQUESTS;
    delete process.env.RATE_LIMIT_BYPASS_INTERNAL_TOKENS;
    delete process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD;
    delete process.env.CIRCUIT_BREAKER_RESET_AFTER_MS;
    delete process.env.SERVICE_TIMEOUT_MS;
  }
});

test('validateConfig reads mongo pool env vars', () => {
  process.env.MONGO_MIN_POOL_SIZE = '2';
  process.env.MONGO_MAX_POOL_SIZE = '12';
  try {
    const config = validateConfig();
    assert.equal(config.mongoMinPoolSize, 2);
    assert.equal(config.mongoMaxPoolSize, 12);
  } finally {
    delete process.env.MONGO_MIN_POOL_SIZE;
    delete process.env.MONGO_MAX_POOL_SIZE;
  }
});

test('validateConfig rejects invalid mongo pool env vars', () => {
  for (const [name, value] of [
    ['MONGO_MIN_POOL_SIZE', '0'],
    ['MONGO_MAX_POOL_SIZE', '-1'],
    ['MONGO_MIN_POOL_SIZE', 'abc'],
    ['MONGO_MAX_POOL_SIZE', '2.5']
  ]) {
    process.env[name] = value;
    try {
      assert.throws(() => validateConfig(), /must be a positive integer/);
    } finally {
      delete process.env[name];
    }
  }
});

test('validateConfig rejects mongo min pool greater than max pool', () => {
  process.env.MONGO_MIN_POOL_SIZE = '30';
  process.env.MONGO_MAX_POOL_SIZE = '20';
  try {
    assert.throws(() => validateConfig(), /MONGO_MIN_POOL_SIZE must be less than or equal to MONGO_MAX_POOL_SIZE/);
  } finally {
    delete process.env.MONGO_MIN_POOL_SIZE;
    delete process.env.MONGO_MAX_POOL_SIZE;
  }
});

test('limiter returns a middleware function', () => {
  const middleware = limiter();
  assert.equal(typeof middleware, 'function');
  assert.equal(middleware.length, 3);
});

test('limiter accepts custom config', () => {
  const middleware = limiter({ rateLimitWindowMs: 60000, rateLimitMaxRequests: 50, rateLimitBypassInternalTokens: false });
  assert.equal(typeof middleware, 'function');
  assert.equal(middleware.length, 3);
});

test('limiter uses default options when called with no arguments', () => {
  const middleware = limiter();
  assert.equal(typeof middleware, 'function');
  assert.doesNotThrow(() => limiter());
  assert.doesNotThrow(() => limiter({}));
  assert.doesNotThrow(() => limiter({ rateLimitWindowMs: 60000 }));
  assert.doesNotThrow(() => limiter({ rateLimitMaxRequests: 50 }));
  assert.doesNotThrow(() => limiter({ rateLimitBypassInternalTokens: false }));
});

test('gateway proxy passes configured timeout to downstream service calls', async () => {
  const config = { serviceTimeoutMs: 1234 };
  const breakers = createServiceBreakers(config);
  let axiosOptions;
  const axiosClient = async (options) => {
    axiosOptions = options;
    return { status: 200, data: { ok: true } };
  };
  const router = createProxyRouter(config, breakers, axiosClient);

  const response = await invokeRouter(router, {
    path: '/api/matching/donors?bloodType=A%2B',
    query: { bloodType: 'A+' }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(axiosOptions.timeout, 1234);
  assert.equal(axiosOptions.url, 'http://localhost:3001/donors');
  assert.deepEqual(axiosOptions.params, { bloodType: 'A+' });
});

test('gateway proxy opens circuit on downstream 5xx and returns graceful error', async () => {
  const config = { circuitBreakerFailureThreshold: 1, circuitBreakerResetAfterMs: 30000, serviceTimeoutMs: 5000 };
  const breakers = createServiceBreakers(config);
  const axiosClient = async () => ({ status: 500, data: { error: 'down' } });
  const router = createProxyRouter(config, breakers, axiosClient);

  const first = await invokeRouter(router, { path: '/api/matching/find' });
  const second = await invokeRouter(router, { path: '/api/matching/find' });

  assert.equal(first.statusCode, 503);
  assert.deepEqual(first.body, {
    success: false,
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Matching service temporarily unavailable'
    }
  });
  assert.equal(second.statusCode, 503);
  assert.equal(second.body.error.code, 'SERVICE_UNAVAILABLE');

  assert.equal(breakers.get('matching').getState(), 'open');
});

test('gateway proxy counts timeouts as failures', async () => {
  const config = { circuitBreakerFailureThreshold: 1, circuitBreakerResetAfterMs: 30000, serviceTimeoutMs: 5000 };
  const breakers = createServiceBreakers(config);
  const axiosClient = async () => {
    const error = new Error('timeout');
    error.code = 'ECONNABORTED';
    error.isAxiosError = true;
    throw error;
  };
  const router = createProxyRouter(config, breakers, axiosClient);

  const response = await invokeRouter(router, { path: '/api/inventory/stock' });

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.error.code, 'SERVICE_UNAVAILABLE');

  assert.equal(breakers.get('inventory').getState(), 'open');
});

test('gateway proxy does not count downstream 4xx as circuit breaker failure', async () => {
  const config = { circuitBreakerFailureThreshold: 1, circuitBreakerResetAfterMs: 30000, serviceTimeoutMs: 5000 };
  const breakers = createServiceBreakers(config);
  const axiosClient = async () => ({ status: 404, data: { message: 'missing' } });
  const router = createProxyRouter(config, breakers, axiosClient);

  const response = await invokeRouter(router, { path: '/api/analytics/missing' });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, { message: 'missing' });

  assert.equal(breakers.get('analytics').getState(), 'closed');
  assert.equal(breakers.get('analytics').getMetrics().failures, 0);
});

test('gateway monitoring route returns named circuit breaker metrics', async () => {
  const breakers = createServiceBreakers();
  const router = createMonitoringRouter(breakers);

  const response = await invokeRouter(router, { path: '/api/gateway/circuit-breakers' });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.matching.name, 'matching');
  assert.equal(response.body.data.inventory.state, 'closed');
  assert.ok(response.body.data.notifications);
  assert.ok(response.body.data.analytics);
  assert.ok(response.body.data.saga);
});
