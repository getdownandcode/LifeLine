const test = require('node:test');
const assert = require('node:assert/strict');
const { buildController } = require('../../services/inventory/src/controllers/inventoryController');

const HOSPITAL_ID = '660000000000000000000101';

function invoke(handler, { params = {}, body = {} }) {
  return new Promise((resolve, reject) => {
    const req = {
      method: 'POST',
      url: '/test',
      originalUrl: '/test',
      params,
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
        return this;
      }
    };
    handler(req, res, (error) => {
      if (error) resolve({ error });
      else reject(new Error('handler should not respond successfully'));
    });
  });
}

const controller = buildController({ publisher: null });

test('inventory reserve rejects negative units', async () => {
  const { error } = await invoke(controller.reserve, {
    params: { id: HOSPITAL_ID },
    body: { bloodType: 'A+', units: -100 }
  });

  assert.equal(error.statusCode, 400);
  assert.equal(error.message, 'Invalid units: expected a positive integer');
});

test('inventory reserve rejects zero and fractional units', async () => {
  for (const units of [0, 2.5]) {
    const { error } = await invoke(controller.reserve, {
      params: { id: HOSPITAL_ID },
      body: { bloodType: 'A+', units }
    });

    assert.equal(error.statusCode, 400);
    assert.equal(error.message, 'Invalid units: expected a positive integer');
  }
});

test('inventory reserve rejects non-numeric units', async () => {
  const { error } = await invoke(controller.reserve, {
    params: { id: HOSPITAL_ID },
    body: { bloodType: 'A+', units: 'abc' }
  });

  assert.equal(error.statusCode, 400);
  assert.equal(error.message, 'Invalid units: expected a positive integer');
});

test('inventory reserve rejects boolean units', async () => {
  const { error } = await invoke(controller.reserve, {
    params: { id: HOSPITAL_ID },
    body: { bloodType: 'A+', units: true }
  });

  assert.equal(error.statusCode, 400);
  assert.equal(error.message, 'Invalid units: expected a positive integer');
});

test('inventory update rejects NaN unitsChange before it can poison stock', async () => {
  const { error } = await invoke(controller.update, {
    params: { id: HOSPITAL_ID },
    body: { bloodType: 'A+', unitsChange: 'abc', lat: 19.076, lng: 72.8777 }
  });

  assert.equal(error.statusCode, 400);
  assert.equal(error.message, 'Invalid unitsChange: expected a non-zero integer');
});

test('inventory update rejects zero unitsChange', async () => {
  const { error } = await invoke(controller.update, {
    params: { id: HOSPITAL_ID },
    body: { bloodType: 'A+', unitsChange: 0, lat: 19.076, lng: 72.8777 }
  });

  assert.equal(error.statusCode, 400);
  assert.equal(error.message, 'Invalid unitsChange: expected a non-zero integer');
});

test('inventory update rejects fractional unitsChange', async () => {
  const { error } = await invoke(controller.update, {
    params: { id: HOSPITAL_ID },
    body: { bloodType: 'A+', unitsChange: 2.5, lat: 19.076, lng: 72.8777 }
  });

  assert.equal(error.statusCode, 400);
  assert.equal(error.message, 'Invalid unitsChange: expected a non-zero integer');
});

test('inventory transfer rejects negative units', async () => {
  const { error } = await invoke(controller.transfer, {
    body: {
      fromHospitalId: HOSPITAL_ID,
      toHospitalId: '660000000000000000000102',
      bloodType: 'A+',
      units: -100
    }
  });

  assert.equal(error.statusCode, 400);
  assert.equal(error.message, 'Invalid units: expected a positive integer');
});

test('inventory transfer rejects boolean units', async () => {
  const { error } = await invoke(controller.transfer, {
    body: {
      fromHospitalId: HOSPITAL_ID,
      toHospitalId: '660000000000000000000102',
      bloodType: 'A+',
      units: true
    }
  });

  assert.equal(error.statusCode, 400);
  assert.equal(error.message, 'Invalid units: expected a positive integer');
});
