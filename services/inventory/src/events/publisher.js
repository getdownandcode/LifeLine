const { randomUUID } = require('crypto');
const { EXCHANGES } = require('../../../../shared/constants/eventTypes');

async function createPublisher(amqpUrl, logger) {
  const amqp = require('amqplib');
  const connection = await amqp.connect(amqpUrl);
  const channel = await connection.createChannel();
  await channel.assertExchange(EXCHANGES.DIRECT, 'direct', { durable: true });
  await channel.assertExchange(EXCHANGES.FANOUT, 'fanout', { durable: true });

  const state = { connection, channel };

  const markDisconnected = () => {
    state.channel = null;
    state.connection = null;
  };

  connection.on('error', (error) => {
    logger?.error?.({ err: error }, 'RabbitMQ connection error');
    markDisconnected();
  });
  connection.on('close', () => markDisconnected());
  channel.on('error', (error) => {
    logger?.error?.({ err: error }, 'RabbitMQ channel error');
    markDisconnected();
  });
  channel.on('close', () => {
    state.channel = null;
  });

  return {
    isConnected() {
      return Boolean(state.connection && state.channel);
    },
    async close() {
      if (state.channel) await state.channel.close();
      if (state.connection) await state.connection.close();
      markDisconnected();
    },
    publish(exchange, routingKey, payload) {
      try {
        if (!state.channel) return false;
        return state.channel.publish(exchange, routingKey, Buffer.from(JSON.stringify({
          eventId: randomUUID(),
          event: routingKey,
          timestamp: new Date().toISOString(),
          payload
        })), { persistent: true, contentType: 'application/json' });
      } catch (error) {
        logger?.warn?.({ err: error }, 'RabbitMQ publish failed');
        return false;
      }
    }
  };
}

module.exports = { createPublisher };
