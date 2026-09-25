const test = require('node:test');
const assert = require('node:assert/strict');
const { EVENTS } = require('../../shared/constants/eventTypes');
const { errorHandler } = require('../../shared/middleware/errorHandler');
const { createSagaRouter } = require('../../services/saga/src/server');

function invokeRouter(router, { method = 'GET', path, body } = {}) {
  router.use(errorHandler);
  return new Promise((resolve, reject) => {
    const req = {
      method,
      url: path,
      originalUrl: path,
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

function createStubModel({ count = 0, steps = [], createError = null, findError = null } = {}) {
  const created = [];
  return {
    createdDocs: created,
    async countDocuments() {
      return count;
    },
    async create(doc) {
      if (createError) throw createError;
      created.push(doc);
      return { ...doc, _id: 'step-id' };
    },
    find() {
      if (findError) return { sort: async () => { throw findError; } };
      return { sort: async () => steps };
    }
  };
}

test('saga events require an event field', async () => {
  const model = createStubModel();
  const router = createSagaRouter({ model });

  const response = await invokeRouter(router, {
    method: 'POST',
    path: '/events',
    body: { payload: { requestId: 'r1' } }
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.message, 'Missing required fields: event');
  assert.equal(model.createdDocs.length, 0);
});

test('saga events missing requestId return a client error', async () => {
  const model = createStubModel();
  const router = createSagaRouter({ model });

  const response = await invokeRouter(router, {
    method: 'POST',
    path: '/events',
    body: { event: EVENTS.EMERGENCY_CREATED, payload: {} }
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.message, 'requestId missing');
  assert.equal(model.createdDocs.length, 0);
});

test('saga events without a body return a client error', async () => {
  const model = createStubModel();
  const router = createSagaRouter({ model });

  const response = await invokeRouter(router, {
    method: 'POST',
    path: '/events',
    body: undefined
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.message, 'Missing required fields: event');
});

test('saga events persist a step and return the next workflow step', async () => {
  const model = createStubModel({ count: 2 });
  const router = createSagaRouter({ model });

  const response = await invokeRouter(router, {
    method: 'POST',
    path: '/events',
    body: { event: EVENTS.EMERGENCY_CREATED, payload: { requestId: 'r1' } }
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.body.data, {
    requestId: 'r1',
    next: { event: EVENTS.MATCH_REQUESTED, payload: { requestId: 'r1' } },
    historyLength: 3
  });
  assert.equal(model.createdDocs.length, 1);
  assert.equal(model.createdDocs[0].sequence, 3);
  assert.equal(model.createdDocs[0].event, EVENTS.EMERGENCY_CREATED);
});

test('saga events forward persistence failures to the error handler', async () => {
  const persistenceError = new Error('db down');
  const model = createStubModel({ createError: persistenceError });
  const router = createSagaRouter({ model });

  const response = await invokeRouter(router, {
    method: 'POST',
    path: '/events',
    body: { event: EVENTS.EMERGENCY_CREATED, payload: { requestId: 'r1' } }
  });

  assert.equal(response.statusCode, 500);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.message, 'Internal server error');
});

test('saga history returns stored steps in sequence order', async () => {
  const steps = [{ requestId: 'r1', sequence: 1 }, { requestId: 'r1', sequence: 2 }];
  const model = createStubModel({ steps });
  const router = createSagaRouter({ model });

  const response = await invokeRouter(router, { path: '/sagas/r1' });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.deepEqual(response.body.data, steps);
});

test('saga history forwards query failures to the error handler', async () => {
  const queryError = new Error('connection lost');
  const model = createStubModel({ findError: queryError });
  const router = createSagaRouter({ model });

  const response = await invokeRouter(router, { path: '/sagas/r1' });

  assert.equal(response.statusCode, 500);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.message, 'Internal server error');
});
