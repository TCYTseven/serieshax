import { Kafka, logLevel } from 'kafkajs';
import { env } from './env';

/**
 * Create and configure the Kafka client for Series
 */
export const kafka = new Kafka({
  clientId: env.KAFKA_CLIENT_ID,
  brokers: [env.KAFKA_BOOTSTRAP_SERVERS],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: env.KAFKA_SASL_USERNAME,
    password: env.KAFKA_SASL_PASSWORD,
  },
  logLevel: env.NODE_ENV === 'development' ? logLevel.INFO : logLevel.ERROR,
  connectionTimeout: 10000,
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});

/**
 * Kafka configuration constants
 */
export const kafkaConfig = {
  topic: env.KAFKA_TOPIC,
  consumerGroup: env.KAFKA_CONSUMER_GROUP,
  clientId: env.KAFKA_CLIENT_ID,
  senderNumber: env.SERIES_SENDER_NUMBER,
};

console.log('📡 Kafka client configured:', {
  clientId: kafkaConfig.clientId,
  brokers: env.KAFKA_BOOTSTRAP_SERVERS,
  topic: kafkaConfig.topic,
  consumerGroup: kafkaConfig.consumerGroup,
});
