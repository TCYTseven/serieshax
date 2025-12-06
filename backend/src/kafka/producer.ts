import { Producer, RecordMetadata } from 'kafkajs';
import { kafka, kafkaConfig } from '../config/kafka';
import { OutgoingMessage } from './types';

/**
 * Kafka Producer for sending SMS messages via Series
 */
class SeriesProducer {
  private producer: Producer;
  private isConnected: boolean = false;

  constructor() {
    this.producer = kafka.producer({
      allowAutoTopicCreation: false,
      transactionTimeout: 30000,
    });
  }

  /**
   * Connect to Kafka
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('ℹ️ Producer already connected');
      return;
    }

    try {
      console.log('🔌 Connecting producer to Kafka...');
      await this.producer.connect();
      this.isConnected = true;
      console.log('✅ Producer connected to Kafka');
    } catch (error) {
      console.error('❌ Failed to connect producer:', error);
      throw error;
    }
  }

  /**
   * Send an SMS message to a user via Series
   */
  async sendMessage(to: string, body: string): Promise<RecordMetadata[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    const message: OutgoingMessage = {
      event: 'send_message',
      data: {
        to,
        body,
      },
    };

    console.log(`\n📤 Sending SMS to ${to}:`);
    console.log(`   Message: "${body}"`);

    try {
      const result = await this.producer.send({
        topic: kafkaConfig.topic,
        messages: [
          {
            key: to, // Use phone number as key for ordering
            value: JSON.stringify(message),
          },
        ],
      });

      console.log('✅ Message sent successfully!');
      console.log(`   Topic: ${kafkaConfig.topic}`);
      console.log(`   Partition: ${result[0].partition}`);
      console.log(`   Offset: ${result[0].offset}`);

      return result;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Send a raw Kafka message (for custom events)
   */
  async sendRaw(event: string, data: Record<string, unknown>): Promise<RecordMetadata[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    const message = { event, data };

    console.log(`\n📤 Sending raw event: ${event}`);

    try {
      const result = await this.producer.send({
        topic: kafkaConfig.topic,
        messages: [
          {
            value: JSON.stringify(message),
          },
        ],
      });

      console.log('✅ Raw message sent successfully!');
      return result;
    } catch (error) {
      console.error('❌ Failed to send raw message:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Kafka
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      console.log('ℹ️ Producer not connected');
      return;
    }

    try {
      console.log('🛑 Disconnecting producer...');
      await this.producer.disconnect();
      this.isConnected = false;
      console.log('✅ Producer disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting producer:', error);
      throw error;
    }
  }

  /**
   * Check if producer is connected
   */
  isProducerConnected(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const seriesProducer = new SeriesProducer();
