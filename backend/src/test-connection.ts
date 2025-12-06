/**
 * Test script for Kafka connection
 * Reads credentials from .env file
 */
import dotenv from 'dotenv';
dotenv.config();

import { Kafka } from 'kafkajs';

// Kafka Configuration from environment
const KAFKA_USERNAME = process.env.KAFKA_SASL_USERNAME!;
const KAFKA_PASSWORD = process.env.KAFKA_SASL_PASSWORD!;
const KAFKA_BROKERS = process.env.KAFKA_BOOTSTRAP_SERVERS!;
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID!;
const KAFKA_TOPIC = process.env.KAFKA_TOPIC!;
const KAFKA_CONSUMER_GROUP = process.env.KAFKA_CONSUMER_GROUP!;

console.log('🔑 Using credentials:');
console.log('   Username:', KAFKA_USERNAME);
console.log('   Password:', KAFKA_PASSWORD.substring(0, 10) + '...');
console.log('   Brokers:', KAFKA_BROKERS);
console.log('');

const kafka = new Kafka({
  clientId: KAFKA_CLIENT_ID,
  brokers: [KAFKA_BROKERS],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: KAFKA_USERNAME,
    password: KAFKA_PASSWORD
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: KAFKA_CONSUMER_GROUP });

async function testConnection() {
  console.log('🔌 Testing Kafka connection...\n');

  // Test Producer
  try {
    console.log('📤 Connecting producer...');
    await producer.connect();
    console.log('✅ Producer connected successfully!\n');

    const message = {
      event: 'test_message',
      data: {
        message: 'Hello from Social Oracle!',
        timestamp: new Date().toISOString()
      }
    };

    console.log('📤 Sending test message...');
    const result = await producer.send({
      topic: KAFKA_TOPIC,
      messages: [
        {
          value: JSON.stringify(message)
        }
      ]
    });

    console.log('✅ Message sent successfully!');
    console.log('   Partition:', result[0].partition);
    console.log('   Offset:', result[0].offset);
    console.log('');
  } catch (error) {
    console.error('❌ Producer error:', error);
  }

  // Test Consumer
  try {
    console.log('📥 Connecting consumer...');
    await consumer.connect();
    console.log('✅ Consumer connected successfully!\n');

    console.log('📥 Subscribing to topic...');
    await consumer.subscribe({ 
      topic: KAFKA_TOPIC, 
      fromBeginning: false 
    });
    console.log('✅ Subscribed to topic!\n');

    console.log('📥 Starting consumer (will run for 10 seconds to catch any messages)...');
    console.log('   Send an SMS to +16463450518 to test!\n');

    // Run consumer for 10 seconds
    const timeout = setTimeout(async () => {
      console.log('\n⏱️ Test timeout reached, shutting down...');
      await consumer.disconnect();
      await producer.disconnect();
      console.log('✅ Test completed successfully!');
      process.exit(0);
    }, 10000);

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        console.log('\n📨 ═══════════════════════════════════════════');
        console.log('📬 Message received!');
        console.log('   Topic:', topic);
        console.log('   Partition:', partition);
        console.log('   Offset:', message.offset);
        console.log('   Value:', message.value?.toString());
        console.log('═══════════════════════════════════════════\n');
      }
    });

  } catch (error) {
    console.error('❌ Consumer error:', error);
    await producer.disconnect();
    process.exit(1);
  }
}

testConnection();
