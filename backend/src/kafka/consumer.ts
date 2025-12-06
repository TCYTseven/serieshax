import { Consumer, EachMessagePayload } from 'kafkajs';
import { kafka, kafkaConfig } from '../config/kafka';
import { 
  KafkaMessagePayload, 
  isIncomingMessage, 
  parseIncomingMessage,
  ParsedIncomingMessage 
} from './types';

/**
 * Message handler callback type
 */
export type MessageHandler = (message: ParsedIncomingMessage) => Promise<void>;

/**
 * Kafka Consumer for Series SMS messages
 */
class SeriesConsumer {
  private consumer: Consumer;
  private isRunning: boolean = false;
  private messageHandler: MessageHandler | null = null;

  constructor() {
    this.consumer = kafka.consumer({ 
      groupId: kafkaConfig.consumerGroup,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
  }

  /**
   * Set a custom message handler
   */
  setMessageHandler(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  /**
   * Connect to Kafka and start consuming messages
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('⚠️ Consumer is already running');
      return;
    }

    try {
      console.log('🔌 Connecting to Kafka...');
      await this.consumer.connect();
      console.log('✅ Connected to Kafka');

      console.log(`📥 Subscribing to topic: ${kafkaConfig.topic}`);
      await this.consumer.subscribe({ 
        topic: kafkaConfig.topic, 
        fromBeginning: false 
      });
      console.log('✅ Subscribed to topic');

      this.isRunning = true;

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });

      console.log('🚀 Consumer is running and waiting for messages...');
    } catch (error) {
      console.error('❌ Failed to start consumer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming Kafka messages
   */
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    const offset = message.offset;
    const timestamp = message.timestamp;

    console.log('\n📨 ═══════════════════════════════════════════');
    console.log(`📬 New message received!`);
    console.log(`   Topic: ${topic}`);
    console.log(`   Partition: ${partition}`);
    console.log(`   Offset: ${offset}`);
    console.log(`   Timestamp: ${new Date(parseInt(timestamp)).toISOString()}`);

    if (!message.value) {
      console.log('⚠️ Empty message received, skipping...');
      return;
    }

    try {
      const rawValue = message.value.toString();
      console.log(`   Raw value: ${rawValue}`);

      const parsedMessage: KafkaMessagePayload = JSON.parse(rawValue);
      console.log(`   Event type: ${parsedMessage.event}`);

      if (isIncomingMessage(parsedMessage)) {
        const parsed = parseIncomingMessage(parsedMessage);
        
        console.log('📱 SMS Details:');
        console.log(`   From: ${parsed.from}`);
        console.log(`   To: ${parsed.to}`);
        console.log(`   Body: "${parsed.body}"`);
        console.log(`   Message ID: ${parsed.messageId}`);
        console.log('═══════════════════════════════════════════\n');

        // Call custom handler if set
        if (this.messageHandler) {
          await this.messageHandler(parsed);
        }
      } else {
        console.log(`ℹ️ Non-SMS event received: ${parsedMessage.event}`);
        console.log(`   Data: ${JSON.stringify(parsedMessage.data, null, 2)}`);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
      console.error('   Raw message:', message.value?.toString());
    }
  }

  /**
   * Gracefully stop the consumer
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('ℹ️ Consumer is not running');
      return;
    }

    try {
      console.log('🛑 Stopping consumer...');
      await this.consumer.disconnect();
      this.isRunning = false;
      console.log('✅ Consumer stopped');
    } catch (error) {
      console.error('❌ Error stopping consumer:', error);
      throw error;
    }
  }

  /**
   * Check if consumer is running
   */
  isConsumerRunning(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const seriesConsumer = new SeriesConsumer();
