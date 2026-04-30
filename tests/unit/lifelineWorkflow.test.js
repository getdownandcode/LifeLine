const test = require('node:test');
const assert = require('node:assert/strict');
const { main } = require('../../scripts/lifeline');

function createWorkflowClient(requests) {
  return {
    async request(request) {
      requests.push(request);
      return { status: 200, statusText: 'OK', data: { success: true, data: responseFor(request) } };
    }
  };
}

function responseFor(request) {
  if (request.method === 'post' && request.url === '/api/matching/emergency') {
    return { _id: '66000000000000000000e001', status: 'pending' };
  }
  if (request.method === 'get' && request.url === '/api/matching/donors/nearby') {
    return { items: [{ donor: { id: 'donor-1', bloodType: request.params.bloodType }, compatibilityScore: 0.95 }] };
  }
  if (request.method === 'post' && request.url.startsWith('/api/matching/match/')) {
    return { request: { status: 'matched' }, matches: [] };
  }
  if (request.method === 'get' && request.url.startsWith('/api/matching/match/status/')) {
    return { status: 'matched' };
  }
  if (request.method === 'get' && request.url.includes('/stock')) {
    return [{ bloodType: 'A+', unitsAvailable: 10 }];
  }
  if (request.method === 'put' && request.url.includes('/update')) {
    return { bloodType: request.data.bloodType, unitsAvailable: 15 };
  }
  if (request.method === 'post' && request.url.includes('/reserve')) {
    return { bloodType: request.data.bloodType, unitsReserved: request.data.units };
  }
  if (request.method === 'get' && request.url === '/api/inventory/alerts/low-stock') {
    return [];
  }
  if (request.method === 'post' && request.url.startsWith('/api/notifications/')) {
    return { status: 'sent' };
  }
  if (request.method === 'post' && request.url === '/api/saga/events') {
    return { status: 'recorded' };
  }
  if (request.method === 'post' && request.url === '/api/analytics/events') {
    return { status: 'recorded' };
  }
  if (request.method === 'get' && request.url === '/api/analytics/metrics') {
    return { requests: 1 };
  }
  return { ok: true };
}

async function runWorkflow(commands) {
  const requests = [];
  const originalLog = console.log;
  console.log = () => {};

  try {
    for (const command of commands) {
      await main([...command, '--json'], () => createWorkflowClient(requests));
    }
  } finally {
    console.log = originalLog;
  }

  return requests;
}

test('CLI workflow creates a critical kidney emergency, searches donors, and broadcasts', async () => {
  const requests = await runWorkflow([
    [
      'emergency', 'create',
      '--patient', 'case-001',
      '--blood', 'O+',
      '--organ', 'kidney',
      '--hospital', '660000000000000000000101',
      '--lat', '18.902',
      '--lng', '67.8764',
      '--urgency', 'critical'
    ],
    [
      'donors', 'nearby',
      '--lat', '18.902',
      '--lng', '67.8764',
      '--radius', '15000',
      '--blood', 'O+',
      '--organ', 'kidney',
      '--limit', '5'
    ],
    ['notify', 'broadcast', '--message', 'Maintenance starts at 8 PM']
  ]);

  assert.deepEqual(requests.map((request) => `${request.method} ${request.url}`), [
    'post /api/matching/emergency',
    'get /api/matching/donors/nearby',
    'post /api/notifications/broadcast'
  ]);
  assert.equal(requests[0].data.urgency, 'critical');
  assert.equal(requests[1].params.bloodType, 'O+');
  assert.equal(requests[2].data.to, undefined);
  assert.equal(requests[2].data.message, 'Maintenance starts at 8 PM');
});

test('CLI workflow accepts high urgency, runs matching, checks status, and sends SMS', async () => {
  const requests = await runWorkflow([
    [
      'emergency', 'create',
      '--patient', 'case-002',
      '--blood', 'A+',
      '--organ', 'heart',
      '--hospital', '660000000000000000000101',
      '--lat', '19.071',
      '--lng', '72.345',
      '--urgency', 'High'
    ],
    ['match', 'run', '66000000000000000000e001'],
    ['match', 'status', '66000000000000000000e001'],
    ['notify', 'sms', '--to', '+911111111111', '--message', 'Compatible donor found']
  ]);

  assert.deepEqual(requests.map((request) => `${request.method} ${request.url}`), [
    'post /api/matching/emergency',
    'post /api/matching/match/66000000000000000000e001',
    'get /api/matching/match/status/66000000000000000000e001',
    'post /api/notifications/sms'
  ]);
  assert.equal(requests[0].data.urgency, 'urgent');
  assert.equal(requests[0].data.organRequired, 'heart');
  assert.equal(requests[3].data.to, '+911111111111');
});

test('CLI workflow updates inventory and records saga and analytics events', async () => {
  const requests = await runWorkflow([
    ['inventory', 'stock', '660000000000000000000101'],
    [
      'inventory', 'update', '660000000000000000000101',
      '--blood', 'A+',
      '--units', '+5',
      '--lat', '19.076',
      '--lng', '72.8777'
    ],
    [
      'inventory', 'reserve', '660000000000000000000101',
      '--blood', 'A+',
      '--units', '1'
    ],
    ['inventory', 'alerts', '--threshold', '3'],
    ['saga', 'event', '--event', 'emergency.created', '--request', '66000000000000000000e001'],
    ['analytics', 'event', '--event', 'emergency.created', '--request', '66000000000000000000e001'],
    ['analytics', 'metrics']
  ]);

  assert.deepEqual(requests.map((request) => `${request.method} ${request.url}`), [
    'get /api/inventory/hospitals/660000000000000000000101/stock',
    'put /api/inventory/hospitals/660000000000000000000101/update',
    'post /api/inventory/hospitals/660000000000000000000101/reserve',
    'get /api/inventory/alerts/low-stock',
    'post /api/saga/events',
    'post /api/analytics/events',
    'get /api/analytics/metrics'
  ]);
  assert.equal(requests[1].data.unitsChange, 5);
  assert.equal(requests[2].data.units, 1);
  assert.equal(requests[3].params.threshold, '3');
  assert.equal(requests[4].data.payload.requestId, '66000000000000000000e001');
});
