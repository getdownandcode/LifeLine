const test = require('node:test');
const assert = require('node:assert/strict');
const { gatewayInfo } = require('../../services/gateway/src/server');
const { auth } = require('../../services/gateway/src/middleware/auth');
const { proxyTarget } = require('../../services/gateway/src/routes/proxy');

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
