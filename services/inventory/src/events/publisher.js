const { randomUUID } = require('crypto');
const { EXCHANGES } = require('../../../../shared/constants/eventTypes');

async function createPublisher(amqpUrl) {
  const amqp = require('amqplib');
  const connection = await amqp.connect(amqpUrl);
  const channel = await connection.createChannel();
  await channel.assertExchange(EXCHANGES.DIRECT, 'direct', { durable: true });
  await channel.assertExchange(EXCHANGES.FANOUT, 'fanout', { durable: true });
  return {
    isConnected() {
      return Boolean(connection && channel);
    },
    async close() {
      await channel.close();
      await connection.close();
    },
    publish(exchange, routingKey, payload) {
      return channel.publish(exchange, routingKey, Buffer.from(JSON.stringify({
        eventId: randomUUID(),
        event: routingKey,
        timestamp: new Date().toISOString(),
        payload
      })), { persistent: true, contentType: 'application/json' });
    }
  };
}

module.exports = { createPublisher };
