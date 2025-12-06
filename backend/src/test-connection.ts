/**
 * Test script for Kafka connection
 * Reads credentials from .env file
 */
import dotenv from 'dotenv';
dotenv.config();

import { Kafka } from 'kafkajs';

// Kafka Configuration
// ⚠️ UPDATE THESE CREDENTIALS FROM YOUR SERIES DASHBOARD!
const KAFKA_USERNAME = process.env.KAFKA_SASL_USERNAME || 'YOUR_USERNAME_HERE';
const KAFKA_PASSWORD = process.env.KAFKA_SASL_PASSWORD || 'YOUR_PASSWORD_HERE';

console.log('🔑 Using credentials:');
console.log('   Username:', KAFKA_USERNAME);
console.log('   Password:', KAFKA_PASSWORD.substring(0, 10) + '...');
console.log('');

const kafka = new Kafka({
  clientId: 'team-client-ea5cc23f325342af8ce44698138ec42d',
  brokers: ['pkc-619z3.us-east1.gcp.confluent.cloud:9092'],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: KAFKA_USERNAME,
    password: KAFKA_PASSWORD
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'team-cg-ea5cc23f325342af8ce44698138ec42d' });

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
      topic: 'team.team.ea5cc23f325342af8ce44698138ec42d',
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
      topic: 'team.team.ea5cc23f325342af8ce44698138ec42d', 
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
