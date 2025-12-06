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
  private messageCount: Map<number, number> = new Map(); // Track messages per partition
  private lastProcessedOffset: Map<number, string> = new Map(); // Track last offset per partition

  constructor() {
    // Use stable consumer group ID so Kafka tracks offset and only processes new messages
    console.log(`📡 Using consumer group: ${kafkaConfig.consumerGroup}`);
    
    this.consumer = kafka.consumer({ 
      groupId: kafkaConfig.consumerGroup,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1048576, // 1MB
      minBytes: 1,
      maxBytes: 10485760, // 10MB
      maxWaitTimeInMs: 5000, // Wait up to 5 seconds for messages
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

      // Check topic metadata and offsets BEFORE subscribing
      const admin = kafka.admin();
      await admin.connect();
      
      try {
        // Get topic metadata
        const metadata = await admin.fetchTopicMetadata({ topics: [kafkaConfig.topic] });
        console.log(`\n📊 Topic Metadata:`);
        const topic = metadata.topics.find(t => t.name === kafkaConfig.topic);
        if (topic) {
          console.log(`   Partitions: ${topic.partitions.length}`);
          topic.partitions.forEach(p => {
            console.log(`     Partition ${p.partitionId}: ${p.replicas.length} replicas`);
          });
        }
        
        // Get high water marks (latest offsets) for each partition
        const topicOffsets = await admin.fetchTopicOffsets(kafkaConfig.topic);
        console.log(`\n📊 Topic High Water Marks (latest offsets):`);
        topicOffsets.forEach(p => {
          console.log(`   Partition ${p.partition}: offset ${p.offset}`);
        });
        
        // Get consumer group offsets
        try {
          const groupOffsets = await admin.fetchOffsets({
            groupId: kafkaConfig.consumerGroup,
          });
          console.log(`\n📊 Current Consumer Group Offsets:`);
          const groupTopicOffsets = groupOffsets.find(g => g.topic === kafkaConfig.topic);
          if (groupTopicOffsets) {
            groupTopicOffsets.partitions.forEach(p => {
              const highWater = topicOffsets.find(t => t.partition === p.partition);
              const currentOffset = typeof p.offset === 'string' ? parseInt(p.offset) : p.offset;
              const highWaterOffset = highWater ? parseInt(highWater.offset) : null;
              const lag = highWaterOffset !== null ? (highWaterOffset - currentOffset) : 'unknown';
              console.log(`   Partition ${p.partition}: offset ${p.offset} (lag: ${lag} messages)`);
            });
          } else {
            console.log(`   No offsets found - will start from latest`);
          }
        } catch (err) {
          console.log(`   Could not fetch group offsets: ${err}`);
        }
      } catch (err) {
        console.error(`   Error fetching topic info: ${err}`);
      }
      
      await admin.disconnect();
      
      console.log(`\n📥 Subscribing to topic: ${kafkaConfig.topic}`);
      // Try fromBeginning: true temporarily to catch any missed messages
      // Change back to false after debugging
      await this.consumer.subscribe({ 
        topic: kafkaConfig.topic, 
        fromBeginning: true  // TEMPORARILY: Read from beginning to catch missed messages
      });
      console.log('✅ Subscribed to topic (fromBeginning: true - reading ALL messages)');
      console.log('⚠️  WARNING: This will process old messages. Change back to false after debugging!');

      this.isRunning = true;

      // Set up event listeners for debugging
      this.consumer.on(this.consumer.events.GROUP_JOIN, ({ payload }) => {
        console.log('\n🔄 Consumer group join event:');
        console.log(`   Member ID: ${payload.memberId}`);
        console.log(`   Group ID: ${payload.groupId}`);
        console.log(`   Member assignment: ${JSON.stringify(payload.memberAssignment)}`);
        
        // Log which partitions we're assigned to
        const assignments = payload.memberAssignment;
        if (assignments && typeof assignments === 'object') {
          const partitions: number[] = [];
          Object.keys(assignments).forEach(topic => {
            if (assignments[topic] && Array.isArray(assignments[topic])) {
              partitions.push(...assignments[topic]);
            }
          });
          console.log(`   📊 Assigned to partitions: ${partitions.join(', ')}`);
          if (partitions.length === 0) {
            console.log(`   ⚠️  WARNING: No partitions assigned!`);
          }
        }
      });

      this.consumer.on(this.consumer.events.REBALANCING, () => {
        console.log('\n⚠️ Consumer rebalancing - messages may be missed during this time');
      });

      this.consumer.on(this.consumer.events.CRASH, ({ payload: { error } }) => {
        console.error('\n❌ Consumer crashed:', error);
      });

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          const { topic, partition, message } = payload;
          const offset = message.offset;
          
          // Track message counts per partition
          const currentCount = this.messageCount.get(partition) || 0;
          this.messageCount.set(partition, currentCount + 1);
          const lastOffset = this.lastProcessedOffset.get(partition);
          const offsetGap = lastOffset ? (parseInt(offset) - parseInt(lastOffset) - 1) : 0;
          
          console.log(`\n📥 ========================================`);
          console.log(`📥 RAW MESSAGE RECEIVED at Kafka level:`);
          console.log(`   Topic: ${topic}`);
          console.log(`   Partition: ${partition}`);
          console.log(`   Offset: ${offset}`);
          if (offsetGap > 0) {
            console.log(`   ⚠️  GAP DETECTED: ${offsetGap} messages skipped since last message!`);
          }
          console.log(`   Messages from partition ${partition}: ${currentCount + 1}`);
          console.log(`   Timestamp: ${message.timestamp}`);
          console.log(`   Key: ${message.key?.toString() || '(none)'}`);
          console.log(`   Value length: ${message.value?.length || 0} bytes`);
          console.log(`📥 ========================================`);
          
          try {
            await this.handleMessage(payload);
            this.lastProcessedOffset.set(partition, offset);
            console.log(`\n✅ Message processed successfully (offset ${offset}, partition ${partition})`);
          } catch (error) {
            console.error(`\n❌ Error processing message (offset ${offset}, partition ${partition}):`, error);
            // Don't throw - continue processing other messages
          }
        },
      });

      console.log('🚀 Consumer is running and waiting for messages...');
      console.log(`   Consumer Group: ${kafkaConfig.consumerGroup}`);
      console.log(`   Topic: ${kafkaConfig.topic}`);
      console.log(`   ⚠️  Reading from BEGINNING (fromBeginning: true) - will process ALL messages`);
      console.log(`   💡 This is for debugging. Change back to false after fixing the issue!`);
      
      // Set up periodic heartbeat to show consumer is alive and check status
      const heartbeatInterval = setInterval(async () => {
        console.log('\n💓 Consumer heartbeat - still listening for messages...');
        console.log(`   Consumer running: ${this.isRunning}`);
        console.log(`   Handler set: ${this.messageHandler !== null}`);
        
        // Check partition assignments and message counts
        console.log(`   Messages processed per partition:`);
        this.messageCount.forEach((count, partition) => {
          console.log(`     Partition ${partition}: ${count} messages`);
        });
        if (this.messageCount.size === 0) {
          console.log(`     ⚠️  No messages processed yet from any partition`);
        }
        
        // Check partition assignments
        try {
          const admin = kafka.admin();
          await admin.connect();
          const groupOffsets = await admin.fetchOffsets({
            groupId: kafkaConfig.consumerGroup,
          });
          const topicOffsets = groupOffsets.find(g => g.topic === kafkaConfig.topic);
          if (topicOffsets) {
            console.log(`   Current consumer group offsets:`);
            topicOffsets.partitions.forEach(p => {
              const lastOffset = this.lastProcessedOffset.get(p.partition);
              console.log(`     Partition ${p.partition}: offset ${p.offset}${lastOffset ? ` (last processed: ${lastOffset})` : ''}`);
            });
          }
          await admin.disconnect();
        } catch (err) {
          console.log(`   Could not fetch offset info: ${err}`);
        }
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

      // Log the full raw message for debugging
      console.log(`   Full raw message: ${JSON.stringify(parsedMessage, null, 2)}`);

      // Handle Series v2 format (message.received)
      if (isSeriesV2Message(parsedMessage)) {
        const parsed = parseSeriesV2Message(parsedMessage);
        
        console.log('📱 SMS Details (Series v2):');
        console.log(`   From: ${parsed.from}`);
        console.log(`   To: ${parsed.to}`);
        console.log(`   Body: "${parsed.body}"`);
        console.log(`   Service: ${parsed.service}`);
        console.log(`   Message ID: ${parsed.messageId}`);
        console.log(`   Chat ID: ${parsed.chatId}`);
        console.log('═══════════════════════════════════════════\n');

        // Call custom handler if set
        if (this.messageHandler) {
          console.log('✅ Calling message handler...');
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
          console.log('✅ Calling message handler...');
          await this.messageHandler(parsed);
        } else {
          console.log('⚠️ No message handler set!');
        }
      } 
      else {
        console.log(`ℹ️ Non-SMS event received: ${eventType}`);
        console.log(`   Data keys: ${Object.keys(parsedMessage.data || {}).join(', ')}`);
        console.log(`   Full message: ${JSON.stringify(parsedMessage, null, 2).substring(0, 500)}`);
        console.log('   ⚠️ This message format is not recognized as an SMS message');
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
