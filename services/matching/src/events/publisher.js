const { randomUUID } = require('crypto');
const { EXCHANGES } = require('../../../../shared/constants/eventTypes');

class EventPublisher {
  constructor(connection, channel, logger) {
    this.connection = connection;
    this.channel = channel;
    this.logger = logger;
    this.attachErrorHandlers(connection, channel);
  }

  static async create(amqpUrl, logger) {
    const amqp = require('amqplib');
    const connection = await amqp.connect(amqpUrl);
    const channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGES.DIRECT, 'direct', { durable: true });
    await channel.assertExchange(EXCHANGES.FANOUT, 'fanout', { durable: true });
    await channel.assertExchange(EXCHANGES.TOPIC, 'topic', { durable: true });
    return new EventPublisher(connection, channel, logger);
  }

  attachErrorHandlers(connection, channel) {
    connection?.on('error', (error) => this.handleAmqpError('connection', error));
    channel?.on('error', (error) => this.handleAmqpError('channel', error));
    connection?.on('close', () => this.markDisconnected());
    channel?.on('close', () => {
      this.channel = null;
    });
  }

  handleAmqpError(kind, error) {
    this.logger?.error?.({ err: error }, `RabbitMQ ${kind} error`);
    this.markDisconnected();
  }

  markDisconnected() {
    this.channel = null;
    this.connection = null;
  }

  isConnected() {
    return Boolean(this.connection && this.channel);
  }

  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    this.channel = null;
    this.connection = null;
  }

  publish(exchange, routingKey, payload, options = {}) {
    try {
      if (!this.channel) return false;
      const message = {
        eventId: options.eventId || randomUUID(),
        event: routingKey,
        timestamp: new Date().toISOString(),
        payload
      };
      return this.channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)), {
        persistent: true,
        contentType: 'application/json',
        headers: { retryCount: options.retryCount || 0 }
      });
    } catch (error) {
      this.logger?.warn?.({ err: error }, 'RabbitMQ publish failed');
      return false;
    }
  }
}

module.exports = { EventPublisher };
