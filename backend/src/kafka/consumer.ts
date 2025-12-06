import { Consumer, EachMessagePayload } from 'kafkajs';
import { kafka, kafkaConfig } from '../config/kafka';
import { 
  KafkaMessagePayload, 
  isIncomingMessage,
  isSeriesV2Message,
  parseIncomingMessage,
  parseSeriesV2Message,
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
    // Use a unique consumer group to avoid partition conflicts with other consumers
    const uniqueGroupId = `${kafkaConfig.consumerGroup}-${Date.now()}`;
    console.log(`📡 Using consumer group: ${uniqueGroupId}`);
    
    this.consumer = kafka.consumer({ 
      groupId: uniqueGroupId,
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
        fromBeginning: false  // Only process new messages, skip historical
      });
      console.log('✅ Subscribed to topic (fromBeginning: false - new messages only)');

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
      console.log(`   Raw value length: ${rawValue.length} chars`);

      const parsedMessage: KafkaMessagePayload = JSON.parse(rawValue);
      const eventType = parsedMessage.event_type || parsedMessage.event || 'unknown';
      console.log(`   Event type: ${eventType}`);

      // Handle Series v2 format (message.received)
      if (isSeriesV2Message(parsedMessage)) {
        const parsed = parseSeriesV2Message(parsedMessage);
        
        console.log('📱 SMS Details (Series v2):');
        console.log(`   From: ${parsed.from}`);
        console.log(`   To: ${parsed.to}`);
        console.log(`   Body: "${parsed.body}"`);
        console.log(`   Service: ${parsed.service}`);
        console.log(`   Message ID: ${parsed.messageId}`);
        console.log('═══════════════════════════════════════════\n');

        // Call custom handler if set
        if (this.messageHandler) {
          await this.messageHandler(parsed);
        } else {
          console.log('⚠️ No message handler set!');
        }
      }
      // Handle legacy format (message_received)
      else if (isIncomingMessage(parsedMessage)) {
        const parsed = parseIncomingMessage(parsedMessage);
        
        console.log('📱 SMS Details (Legacy):');
        console.log(`   From: ${parsed.from}`);
        console.log(`   To: ${parsed.to}`);
        console.log(`   Body: "${parsed.body}"`);
        console.log(`   Message ID: ${parsed.messageId}`);
        console.log('═══════════════════════════════════════════\n');

        // Call custom handler if set
        if (this.messageHandler) {
          await this.messageHandler(parsed);
        } else {
          console.log('⚠️ No message handler set!');
        }
      } 
      else {
        console.log(`ℹ️ Non-SMS event received: ${eventType}`);
        console.log(`   Data keys: ${Object.keys(parsedMessage.data || {}).join(', ')}`);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
      console.error('   Raw message:', message.value?.toString().substring(0, 200));
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
