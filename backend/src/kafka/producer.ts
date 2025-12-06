import { Producer, RecordMetadata } from 'kafkajs';
import { kafka, kafkaConfig } from '../config/kafka';

/**
 * Series API v2 Outgoing Message Format
 */
interface SeriesV2OutgoingMessage {
  event_type: 'message.send';
  data: {
    to_phone: string;
    text: string;
  };
}

/**
 * Legacy Outgoing Message Format
 */
interface LegacyOutgoingMessage {
  event: 'send_message';
  data: {
    to: string;
    body: string;
  };
}

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
   * Send an SMS message to a user via Series (tries both formats)
   */
  async sendMessage(to: string, body: string): Promise<RecordMetadata[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    // Try Series v2 format first
    const messageV2: SeriesV2OutgoingMessage = {
      event_type: 'message.send',
      data: {
        to_phone: to,
        text: body,
      },
    };

    // Also prepare legacy format as fallback
    const messageLegacy: LegacyOutgoingMessage = {
      event: 'send_message',
      data: {
        to,
        body,
      },
    };

    console.log(`\n📤 Sending SMS to ${to}:`);
    console.log(`   Message: "${body}"`);

    try {
      // Send using Series v2 format
      const result = await this.producer.send({
        topic: kafkaConfig.topic,
        messages: [
          {
            key: to,
            value: JSON.stringify(messageV2),
            headers: {
              'event-source': Buffer.from('social-oracle'),
            },
          },
        ],
      });

      console.log('✅ Message sent successfully (v2 format)!');
      console.log(`   Topic: ${kafkaConfig.topic}`);
      console.log(`   Partition: ${result[0].partition}`);
      console.log(`   Offset: ${result[0].offset}`);

      return result;
    } catch (error) {
      console.error('❌ Failed to send message with v2 format, trying legacy...');
      
      // Try legacy format
      try {
        const result = await this.producer.send({
          topic: kafkaConfig.topic,
          messages: [
            {
              key: to,
              value: JSON.stringify(messageLegacy),
            },
          ],
        });

        console.log('✅ Message sent successfully (legacy format)!');
        return result;
      } catch (legacyError) {
        console.error('❌ Failed to send message:', legacyError);
        throw legacyError;
      }
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
