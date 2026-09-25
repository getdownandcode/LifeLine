const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { EventPublisher } = require('../../services/matching/src/events/publisher');

function createFakeChannel({ publishResult = true, publishError = null } = {}) {
  const channel = new EventEmitter();
  channel.publish = () => {
    if (publishError) throw publishError;
    return publishResult;
  };
  channel.close = async () => {};
  return channel;
}

function createFakeConnection() {
  const connection = new EventEmitter();
  connection.close = async () => {};
  return connection;
}

test('publisher reports connected while channel and connection are alive', () => {
  const publisher = new EventPublisher(createFakeConnection(), createFakeChannel());

  assert.equal(publisher.isConnected(), true);
});

test('publisher disconnects fully on channel error', () => {
  const connection = createFakeConnection();
  const channel = createFakeChannel();
  const publisher = new EventPublisher(connection, channel);

  channel.emit('error', new Error('channel closed by server'));

  assert.equal(publisher.isConnected(), false);
  assert.equal(publisher.publish('direct', 'event.test', {}), false);
});

test('publisher disconnects fully on connection error', () => {
  const connection = createFakeConnection();
  const channel = createFakeChannel();
  const publisher = new EventPublisher(connection, channel);

  connection.emit('error', new Error('connection lost'));

  assert.equal(publisher.isConnected(), false);
  assert.equal(publisher.publish('direct', 'event.test', {}), false);
});

test('publisher marks itself unavailable after close events', () => {
  const connection = createFakeConnection();
  const channel = createFakeChannel();
  const publisher = new EventPublisher(connection, channel);

  channel.emit('close');

  assert.equal(publisher.isConnected(), false);
  assert.equal(publisher.publish('direct', 'event.test', {}), false);
});

test('publisher publish does not throw when the underlying channel throws', () => {
  const channel = createFakeChannel({ publishError: new Error('write failed') });
  const publisher = new EventPublisher(createFakeConnection(), channel);

  assert.equal(publisher.publish('direct', 'event.test', {}), false);
});

test('publisher publish forwards successful writes', () => {
  const channel = createFakeChannel({ publishResult: true });
  const publisher = new EventPublisher(createFakeConnection(), channel);

  assert.equal(publisher.publish('direct', 'event.test', { id: 1 }), true);
});

test('publisher close releases channel and connection without throwing', async () => {
  const connection = createFakeConnection();
  const channel = createFakeChannel();
  const publisher = new EventPublisher(connection, channel);

  await publisher.close();

  assert.equal(publisher.isConnected(), false);
});
