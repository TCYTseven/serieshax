import { Consumer, EachMessagePayload, Kafka } from 'kafkajs';
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
    // Use stable consumer group ID so Kafka tracks offset and only processes new messages
    console.log(`📡 Using consumer group: ${kafkaConfig.consumerGroup}`);
    
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
        fromBeginning: false  // Only process new messages, not old ones
      });
      console.log('✅ Subscribed to topic (fromBeginning: false - only new messages)');
      
      // Log consumer group offset info
      const admin = kafka.admin();
      await admin.connect();
      try {
        const groupOffsets = await admin.fetchOffsets({
          groupId: kafkaConfig.consumerGroup,
        });
        console.log(`\n📊 Current consumer group offsets:`);
        const topicOffsets = groupOffsets.find(g => g.topic === kafkaConfig.topic);
        if (topicOffsets) {
          console.log(`   Topic: ${topicOffsets.topic}`);
          topicOffsets.partitions.forEach(p => {
            console.log(`   Partition ${p.partition}: offset ${p.offset}`);
          });
        } else {
          console.log(`   No offsets found for topic ${kafkaConfig.topic} (will start from latest)`);
        }
      } catch (err) {
        console.log(`ℹ️ Could not fetch offsets (group may be new): ${err}`);
      }
      await admin.disconnect();

      this.isRunning = true;

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
      });

      console.log('🚀 Consumer is running and waiting for messages...');
      console.log(`   Consumer Group: ${kafkaConfig.consumerGroup}`);
      console.log(`   Topic: ${kafkaConfig.topic}`);
      console.log(`   Listening for NEW messages only (fromBeginning: false)`);
      
      // Set up periodic heartbeat to show consumer is alive
      const heartbeatInterval = setInterval(() => {
        console.log('💓 Consumer heartbeat - still listening for messages...');
      }, 30000); // Every 30 seconds
      
      // Clean up interval on shutdown (though this won't run if process exits)
      process.on('SIGINT', () => clearInterval(heartbeatInterval));
      process.on('SIGTERM', () => clearInterval(heartbeatInterval));
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
        console.log(`   Full message: ${JSON.stringify(parsedMessage, null, 2).substring(0, 500)}`);
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
