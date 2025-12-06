import { Consumer, EachMessagePayload } from 'kafkajs';
import { kafka, kafkaConfig } from '../config/kafka';
import { intentClassifier } from '../oracle/intentClassifier';
import { buildContext } from '../oracle/contextBuilder';
import { generateResponse } from '../oracle/responseGenerator';
import { seriesApiRobust } from '../services/seriesApi-robust';
import { 
  isSeriesV2Message, 
  parseSeriesV2Message,
  ParsedIncomingMessage 
} from './types';

interface RobustConsumerConfig {
  maxMessageAgeMs?: number;
  concurrency?: number;
  startFromBeginning?: boolean;
  dedupeWindowMs?: number;
  verbose?: boolean;
}

const DEFAULT_CONFIG: Required<RobustConsumerConfig> = {
  maxMessageAgeMs: 5 * 60 * 1000, // 5 minutes - more lenient
  concurrency: 1,
  startFromBeginning: false,
  dedupeWindowMs: 60 * 60 * 1000, // 1 hour
  verbose: true,
};

export class RobustSeriesConsumer {
  private consumer: Consumer;
  private config: Required<RobustConsumerConfig>;
  private isRunning: boolean = false;
  private processedMessages: Map<string, number> = new Map(); // id -> timestamp
  private processingQueue: Array<() => Promise<void>> = [];
  private isProcessing: boolean = false;
  private startupTimestamp: number;
  private messageHandler?: (message: any) => Promise<void>;
  private processedCount: number = 0;
  private skippedOld: number = 0;
  private skippedDuplicate: number = 0;

  constructor(config: RobustConsumerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Set startup timestamp with 30 second buffer for clock drift
    this.startupTimestamp = Date.now() - 30000; 

    this.consumer = kafka.consumer({ 
      groupId: kafkaConfig.consumerGroup,
      sessionTimeout: 45000, // Increased for stability
      heartbeatInterval: 3000,
    });
  }

  /**
   * Allow external handler (e.g., Oracle Agent) to process messages.
   * If set, we bypass the built-in LLM send path and delegate instead.
   */
  public setMessageHandler(handler: (message: any) => Promise<void>): void {
    this.messageHandler = handler;
  }

  public async start() {
    try {
      console.log('🔌 Connecting to Kafka...');
      await this.consumer.connect();
      console.log('✅ Connected to Kafka');

      // Subscribe - NOT from beginning (will use committed offsets or latest)
      await this.consumer.subscribe({ 
        topic: kafkaConfig.topic, 
        fromBeginning: false 
      });
      console.log(`📥 Subscribed to topic: ${kafkaConfig.topic}`);

      this.isRunning = true;
      console.log(`🚀 Robust consumer starting...`);
      console.log(`🛡️ Filter: Ignoring messages older than 5 min`);
      console.log(`🛡️ Filter: Ignoring messages before ${new Date(this.startupTimestamp).toLocaleTimeString()}`);

      // 3. Run
      await this.consumer.run({
        autoCommit: true,
        eachMessage: async (payload) => {
          // Log EVERY message received from Kafka (before any filtering)
          console.log(`\n📥 KAFKA RAW: partition=${payload.partition}, offset=${payload.message.offset}, ts=${payload.message.timestamp}`);
          await this.handleMessage(payload);
        },
      });

    } catch (error) {
      console.error('❌ Failed to start consumer:', error);
      this.isRunning = false;
    }
  }

  private async handleMessage({ topic, partition, message }: EachMessagePayload) {
    const messageTimestamp = Number(message.timestamp);
    const now = Date.now();
    const age = now - messageTimestamp;
    const msgString = message.value?.toString() || '';

    // --- 1. Startup Filter ---
    // If message was born before we started, DROP IT.
    if (messageTimestamp < this.startupTimestamp) {
      if (this.config.verbose) console.log(`⏭️ SKIP (Pre-startup): ${age/1000}s old`);
      this.skippedOld += 1;
      return; 
    }

    // --- 2. Age Filter ---
    // If message is older than max age (1 min), DROP IT.
    if (age > this.config.maxMessageAgeMs) {
      if (this.config.verbose) console.log(`⏭️ SKIP (Too old): ${age/1000}s old`);
      this.skippedOld += 1;
      return;
    }

    try {
      const parsed = JSON.parse(msgString);
      
      // Use message ID or hash for deduplication
      const msgId = parsed.id || `${topic}-${partition}-${message.offset}`;
      
      // --- 3. Deduplication ---
      if (this.isDuplicate(msgId)) {
        if (this.config.verbose) console.log(`♻️ SKIP (Duplicate): ${msgId}`);
      this.skippedDuplicate += 1;
        return;
      }

      console.log(`\n📨 NEW MESSAGE: ${msgString.substring(0, 50)}...`);
      
      // Add to Queue
      this.processingQueue.push(async () => {
        try {
          await this.processBusinessLogic(parsed, msgId);
          this.processedCount += 1;
        } catch (err) {
          console.error('Error processing:', err);
        }
      });
      
      this.processQueue();

    } catch (e) {
      console.error('Error parsing message:', e);
    }
  }

  private isDuplicate(id: string): boolean {
    const now = Date.now();
    // Clean old entries
    for (const [key, timestamp] of this.processedMessages) {
      if (now - timestamp > this.config.dedupeWindowMs) {
        this.processedMessages.delete(key);
      }
    }
    
    if (this.processedMessages.has(id)) return true;
    
    // Mark as processed
    this.processedMessages.set(id, now);
    return false;
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const task = this.processingQueue.shift();
      if (task) await task();
    }

    this.isProcessing = false;
  }

  private async processBusinessLogic(message: any, msgId: string) {
    // Check if this is a Series v2 SMS message (message.received)
    if (!isSeriesV2Message(message)) {
      const eventType = message.event_type || message.event || 'unknown';
      if (this.config.verbose) {
        console.log(`ℹ️ Non-SMS event: ${eventType}, skipping`);
      }
      return;
    }

    // Parse into unified format
    const parsed: ParsedIncomingMessage = parseSeriesV2Message(message);

    // Skip empty messages
    if (!parsed.body || parsed.body.trim() === '') {
      console.log('⚠️ Empty message, skipping');
      return;
    }

    // If a custom handler is registered (OracleAgent), delegate and return.
    if (this.messageHandler) {
      await this.messageHandler(parsed);
      return;
    }

    // --- Fallback: handle without OracleAgent ---
    const userMessage = parsed.body;
    const chatId = parsed.chatId;
    const senderPhone = parsed.from;
    console.log(`🧠 Processing for ${senderPhone}: "${userMessage}"`);

    // 2. Classify Intent
    const intentClassification = await intentClassifier.classify(userMessage);
    
    // 3. Build Context
    // Generate stable IDs from sender phone or message ID
    const odeoUserId = senderPhone || `user-${msgId}`;
    const conversationId = chatId || `conv-${msgId}`;
    
    const context = await buildContext(
      odeoUserId,           // userId
      senderPhone || '',    // phoneNumber
      conversationId,       // conversationId
      userMessage,          // message
      intentClassification  // intentClassification
    );

    // 4. Generate Response (LLM)
    const response = await generateResponse({
      userMessage,
      intent: intentClassification.intent,  // ExtendedIntent, not the full classification
      context,
      responseType: 'general'
    });

    // 5. Send Reply (Fire and Forget)
    console.log(`🔥 Firing reply (no wait): "${response.message.substring(0, 30)}..."`);
    
    if (chatId) {
      // Don't await this - let it run in background
      seriesApiRobust.sendMessageFireAndForget(chatId, response.message);
    } else {
      // Need a phone number to create a chat
      if (!senderPhone) {
        console.warn('⚠️ No sender phone available; cannot create chat. Skipping send.');
        return;
      }
      // Fallback if no chat ID (keep this awaited as it's a heavier operation creating a chat)
      await seriesApiRobust.createChatAndSendMessage(
        kafkaConfig.senderNumber, // send_from (our number)
        senderPhone,              // recipient phone
        response.message
      );
    }
    
    console.log('✅ Handled (reply in flight).');
  }

  /**
   * Stop the consumer gracefully.
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) return;
    console.log('🛑 Stopping consumer...');
    await this.consumer.disconnect();
    this.isRunning = false;
    console.log('✅ Consumer stopped');
  }

  /**
   * Print simple stats (processed / skipped).
   */
  public printStats(): void {
    console.log('📊 RobustConsumer Stats:');
    console.log(`   Processed: ${this.processedCount}`);
    console.log(`   Skipped (old): ${this.skippedOld}`);
    console.log(`   Skipped (duplicate): ${this.skippedDuplicate}`);
  }
}

// Export singleton
export const robustConsumer = new RobustSeriesConsumer();
