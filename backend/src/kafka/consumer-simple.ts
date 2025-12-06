/**
 * SIMPLE Kafka Consumer - Back to Basics
 * No fancy filtering, just receive and respond
 */

import { Consumer, EachMessagePayload } from 'kafkajs';
import { kafka, kafkaConfig } from '../config/kafka';

const SERIES_API_BASE_URL = 'https://series-hackathon-service-202642739529.us-east1.run.app';

// Use UNIQUE consumer group each time (like the starter code)
const UNIQUE_GROUP_ID = `${kafkaConfig.consumerGroup}-${Date.now()}`;

export class SimpleConsumer {
  private consumer: Consumer;
  private messageHandler?: (msg: any) => Promise<void>;

  constructor() {
    console.log(`📡 Using UNIQUE consumer group: ${UNIQUE_GROUP_ID}`);
    this.consumer = kafka.consumer({ groupId: UNIQUE_GROUP_ID });
  }

  setMessageHandler(handler: (msg: any) => Promise<void>) {
    this.messageHandler = handler;
  }

  async start() {
    console.log('🔌 Connecting to Kafka...');
    await this.consumer.connect();
    console.log('✅ Connected');

    console.log(`📥 Subscribing to: ${kafkaConfig.topic}`);
    await this.consumer.subscribe({ 
      topic: kafkaConfig.topic, 
      fromBeginning: false  // Only new messages
    });
    console.log('✅ Subscribed');

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
        console.log('\n════════════════════════════════════════');
        console.log(`📨 MESSAGE RECEIVED`);
        console.log(`   Partition: ${partition}, Offset: ${message.offset}`);
        
        if (!message.value) {
          console.log('   ⚠️ Empty message');
          return;
        }

        const raw = message.value.toString();
        console.log(`   Raw: ${raw.substring(0, 100)}...`);

        try {
          const parsed = JSON.parse(raw);
          const eventType = parsed.event_type || parsed.event || 'unknown';
          console.log(`   Event: ${eventType}`);

          // Only handle message.received events
          if (eventType !== 'message.received') {
            console.log(`   ℹ️ Skipping non-SMS event`);
            return;
          }

          // Extract message details
          const text = parsed.data?.text || '';
          const fromPhone = parsed.data?.from_phone || '';
          const chatId = parsed.data?.chat_id || '';

          console.log(`   From: ${fromPhone}`);
          console.log(`   Text: "${text}"`);
          console.log(`   Chat ID: ${chatId}`);

          if (!text || !chatId) {
            console.log('   ⚠️ Missing text or chatId');
            return;
          }

          // If handler is set, use it
          if (this.messageHandler) {
            await this.messageHandler({
              from: fromPhone,
              body: text,
              chatId: chatId,
              messageId: parsed.data?.id || message.offset,
              to: '',
              timestamp: new Date(),
              service: parsed.data?.service || 'SMS',
              rawMessage: parsed,
            });
          } else {
            // Simple echo response
            console.log('   🔥 Sending simple response...');
            await this.sendMessage(chatId, `Got it! You said: "${text}"`);
          }

        } catch (err) {
          console.error('   ❌ Parse error:', err);
        }
      },
    });

    console.log('\n🚀 Simple consumer is running!');
    console.log('📞 Send a text to test.\n');
  }

  async sendMessage(chatId: string, text: string) {
    const apiKey = process.env.SERIES_API_KEY;
    if (!apiKey) {
      console.log('   ❌ No SERIES_API_KEY');
      return;
    }

    const url = `${SERIES_API_BASE_URL}/api/chats/${chatId}/chat_messages`;
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: { text } }),
      });

      if (res.ok) {
        console.log(`   ✅ Message sent to chat ${chatId}`);
      } else {
        const body = await res.text();
        console.log(`   ❌ Send failed (${res.status}): ${body.substring(0, 100)}`);
      }
    } catch (err: any) {
      console.log(`   ❌ Send error: ${err.message}`);
    }
  }

  async stop() {
    console.log('🛑 Stopping consumer...');
    await this.consumer.disconnect();
    console.log('✅ Stopped');
  }
}

export const simpleConsumer = new SimpleConsumer();
