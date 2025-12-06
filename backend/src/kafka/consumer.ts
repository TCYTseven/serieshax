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
  private processedMessages: Set<string> = new Set(); // Track processed message IDs to prevent duplicates
  private readonly MAX_PROCESSED_CACHE_SIZE = 1000; // Limit cache size

  constructor() {
    // Use stable consumer group ID so Kafka remembers our position
    // This allows us to resume from where we left off and only process NEW messages
    console.log(`📡 Using consumer group: ${kafkaConfig.consumerGroup}`);
    
    this.consumer = kafka.consumer({ 
      groupId: kafkaConfig.consumerGroup,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxInFlightRequests: 1, // Process one message at a time to avoid issues
      retry: {
        retries: 3,
        initialRetryTime: 100,
      },
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
      console.log(`🔌 Connecting to Kafka... (Process ID: ${process.pid})`);
      console.log(`   Consumer Group: ${kafkaConfig.consumerGroup}`);
      console.log(`   Topic: ${kafkaConfig.topic}`);
      await this.consumer.connect();
      console.log('✅ Connected to Kafka');

      console.log(`📥 Subscribing to topic: ${kafkaConfig.topic}`);
      await this.consumer.subscribe({ 
        topic: kafkaConfig.topic, 
        fromBeginning: false  // Only process NEW messages, not old ones
      });
      console.log('✅ Subscribed to topic (fromBeginning: false - only new messages)');

      this.isRunning = true;

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          const { partition, message } = payload;
          const offset = message.offset;
          // Use partition-offset as the unique key (Kafka guarantees this is unique)
          const kafkaMessageKey = `${partition}-${offset}`;
          
          // CRITICAL: Check for duplicates at the Kafka level BEFORE any processing
          // This is the ONLY place we check - if we've seen this partition-offset before, skip entirely
          if (this.processedMessages.has(kafkaMessageKey)) {
            console.log(`   ⚠️ KAFKA DUPLICATE: Partition ${partition} offset ${offset} already processed, skipping`);
            return; // Don't process, don't commit - Kafka will handle offset
          }
          
          // Mark as processing IMMEDIATELY (before parsing) to prevent race conditions
          this.processedMessages.add(kafkaMessageKey);
          
          // Limit cache size
          if (this.processedMessages.size > this.MAX_PROCESSED_CACHE_SIZE) {
            const firstKey = this.processedMessages.values().next().value;
            if (firstKey) {
              this.processedMessages.delete(firstKey);
            }
          }
          
          // Process the message - errors here won't prevent offset commit
          try {
            await this.handleMessage(payload);
          } catch (error) {
            console.error('❌ Error in handleMessage:', error);
            // Don't remove from cache - we've processed it, just had an error
            // Kafka will commit the offset and move on
          }
        },
        // Ensure offsets are committed even if there are errors
        autoCommit: true,
        autoCommitInterval: 1000, // Commit every 1 second
        autoCommitThreshold: 1, // Commit after each message
      });

      console.log('🚀 Consumer is running and waiting for messages...');
    } catch (error) {
      console.error('❌ Failed to start consumer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming Kafka messages
   * IMPORTANT: Errors here should be caught and logged but not rethrown
   * to ensure Kafka commits offsets and continues processing
   */
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    const offset = message.offset;
    const timestamp = message.timestamp;
    const messageStartTime = Date.now();

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
      
      // Extract message ID for logging (deduplication already handled at Kafka level)
      let messageId: string | null = null;
      if (parsedMessage.data && typeof parsedMessage.data === 'object') {
        const data = parsedMessage.data as Record<string, unknown>;
        messageId = String(data.message_id || data.id || `${partition}-${offset}`);
      } else {
        messageId = `${partition}-${offset}`;
      }
      
      console.log(`   ✅ Processing message ID: ${messageId} (offset ${offset}, partition ${partition})`);
      
      // Limit cache size to prevent memory issues
      if (this.processedMessages.size > this.MAX_PROCESSED_CACHE_SIZE) {
        const firstKey = this.processedMessages.values().next().value;
        if (firstKey) {
          this.processedMessages.delete(firstKey);
        }
      }

      // Parse message into unified format - ONLY ONCE
      let parsed: ParsedIncomingMessage | null = null;
      
      // Handle Series v2 format (message.received) - CHECK THIS FIRST
      if (isSeriesV2Message(parsedMessage)) {
        parsed = parseSeriesV2Message(parsedMessage);
        // Add Kafka metadata for reliable deduplication
        parsed.kafkaPartition = partition;
        parsed.kafkaOffset = offset;
        console.log('📱 SMS Details (Series v2):');
        console.log(`   From: ${parsed.from}`);
        console.log(`   To: ${parsed.to}`);
        console.log(`   Body: "${parsed.body}"`);
        console.log(`   Service: ${parsed.service}`);
        console.log(`   Message ID: ${parsed.messageId}`);
        console.log(`   Chat ID: ${parsed.chatId}`);
        console.log(`   Kafka: Partition ${partition}, Offset ${offset}`);
      }
      // Handle legacy format (message_received) - CHECK SECOND
      else if (isIncomingMessage(parsedMessage)) {
        parsed = parseIncomingMessage(parsedMessage);
        // Add Kafka metadata for reliable deduplication
        parsed.kafkaPartition = partition;
        parsed.kafkaOffset = offset;
        console.log('📱 SMS Details (Legacy):');
        console.log(`   From: ${parsed.from}`);
        console.log(`   To: ${parsed.to}`);
        console.log(`   Body: "${parsed.body}"`);
        console.log(`   Message ID: ${parsed.messageId}`);
        console.log(`   Kafka: Partition ${partition}, Offset ${offset}`);
      }
      // Fallback: Try to extract message data from non-standard format
      else if (parsedMessage.data && typeof parsedMessage.data === 'object') {
        const data = parsedMessage.data as Record<string, unknown>;
        if (data.from && data.body) {
          console.log('📱 SMS Details (Non-standard format):');
          parsed = {
            from: String(data.from),
            to: String(data.to || ''),
            body: String(data.body),
            messageId: String(data.message_id || data.id || messageId),
            chatId: String(data.chat_id || data.chatId || ''),
            service: String(data.service || 'unknown'),
            timestamp: new Date(parseInt(timestamp)),
            rawMessage: parsedMessage as any,
            kafkaPartition: partition,
            kafkaOffset: offset,
          };
          console.log(`   From: ${parsed.from}`);
          console.log(`   Body: "${parsed.body}"`);
          console.log(`   Message ID: ${parsed.messageId}`);
          console.log(`   Kafka: Partition ${partition}, Offset ${offset}`);
        }
      }
      
      // Process the message ONCE - regardless of which format it was
      if (!parsed) {
        console.log(`ℹ️ Non-SMS event received: ${eventType}`);
        console.log(`   Data keys: ${Object.keys(parsedMessage.data || {}).join(', ')}`);
        console.log('   → Skipping (not a message)');
        return; // Not a message, skip it
      }
      
      if (!this.messageHandler) {
        console.log('⚠️ No message handler set!');
        return; // No handler, skip it
      }
      
      // Call handler ONCE - this is the ONLY place the handler is called
      // No try-catch here - let errors bubble up so we know if processing failed
      console.log('═══════════════════════════════════════════\n');
      console.log('   → Calling message handler (single call)...');
      await this.messageHandler(parsed);
      console.log('   ✅ Message handler completed successfully');
    } catch (error) {
      const processingTime = Date.now() - messageStartTime;
      console.error('❌ Error processing message:', error);
      console.error(`   Processing time: ${processingTime}ms`);
      console.error(`   Offset: ${offset}`);
      console.error('   Raw message:', message.value?.toString().substring(0, 200));
      if (error instanceof Error) {
        console.error(`   Error message: ${error.message}`);
        console.error(`   Error stack: ${error.stack}`);
      }
      // Don't rethrow - let the outer handler deal with it
      // This ensures the message is marked as processed even if there was an error
    } finally {
      const processingTime = Date.now() - messageStartTime;
      console.log(`   ⏱️ Total processing time: ${processingTime}ms`);
      console.log('═══════════════════════════════════════════\n');
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
