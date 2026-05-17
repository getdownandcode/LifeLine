const test = require('node:test');
const assert = require('node:assert/strict');
const { gatewayInfo } = require('../../services/gateway/src/server');
const { auth } = require('../../services/gateway/src/middleware/auth');
const { proxyTarget } = require('../../services/gateway/src/routes/proxy');
const { readPositiveInt, readBoolean, validateConfig } = require('../../shared/config/validator');
const { limiter } = require('../../services/gateway/src/middleware/rateLimiter');

test('gateway root info describes available public and API routes', () => {
  const info = gatewayInfo();

  assert.equal(info.service, 'LifeLine API Gateway');
  assert.equal(info.health, '/health');
  assert.ok(info.routes.includes('/api/matching'));
  assert.match(info.auth, /Authorization: Bearer <jwt>/);
});

test('gateway API routes require bearer auth in production', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

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
    process.env.NODE_ENV = previousNodeEnv;
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
  const config = validateConfig();
  assert.equal(config.rateLimitWindowMs, 900000);
  assert.equal(config.rateLimitMaxRequests, 100);
  assert.equal(config.rateLimitBypassInternalTokens, true);
});

test('validateConfig reads rate limit env vars', () => {
  process.env.RATE_LIMIT_WINDOW_MS = '60000';
  process.env.RATE_LIMIT_MAX_REQUESTS = '200';
  process.env.RATE_LIMIT_BYPASS_INTERNAL_TOKENS = 'false';
  try {
    const config = validateConfig();
    assert.equal(config.rateLimitWindowMs, 60000);
    assert.equal(config.rateLimitMaxRequests, 200);
    assert.equal(config.rateLimitBypassInternalTokens, false);
  } finally {
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX_REQUESTS;
    delete process.env.RATE_LIMIT_BYPASS_INTERNAL_TOKENS;
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
