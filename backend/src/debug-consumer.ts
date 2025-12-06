/**
 * Debug Consumer - Logs ALL raw Kafka messages
 * Use this to debug why messages might not be processing
 */

import { kafka, kafkaConfig } from './config/kafka';

async function debugConsumer() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           🔍 DEBUG CONSUMER                               ║');
  console.log('║           Logging ALL raw Kafka messages                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');

  console.log('📋 Configuration:');
  console.log(`   Topic: ${kafkaConfig.topic}`);
  console.log(`   Consumer Group: ${kafkaConfig.consumerGroup}`);
  console.log(`   Client ID: ${kafkaConfig.clientId}`);
  console.log('\n');

  const consumer = kafka.consumer({
    groupId: kafkaConfig.consumerGroup + '-debug-' + Date.now(),
    sessionTimeout: 30000,
  });

  try {
    console.log('🔌 Connecting...');
    await consumer.connect();
    console.log('✅ Connected');

    console.log(`📥 Subscribing to topic: ${kafkaConfig.topic}`);
    // Try from beginning to catch old messages too
    await consumer.subscribe({ 
      topic: kafkaConfig.topic, 
      fromBeginning: true  // Get ALL messages including old ones
    });
    console.log('✅ Subscribed (fromBeginning: true)');

    // Also get topic metadata
    const admin = kafka.admin();
    await admin.connect();
    
    const topicMetadata = await admin.fetchTopicMetadata({ topics: [kafkaConfig.topic] });
    console.log('\n📊 Topic Metadata:');
    console.log(JSON.stringify(topicMetadata, null, 2));

    const topicOffsets = await admin.fetchTopicOffsets(kafkaConfig.topic);
    console.log('\n📊 Topic Offsets:');
    console.log(JSON.stringify(topicOffsets, null, 2));

    await admin.disconnect();

    console.log('\n🚀 Starting consumer... Waiting for messages...');
    console.log('   (Will log ALL raw messages)\n');

    let messageCount = 0;

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        messageCount++;
        console.log('\n' + '='.repeat(60));
        console.log(`📨 MESSAGE #${messageCount}`);
        console.log('='.repeat(60));
        console.log(`   Topic: ${topic}`);
        console.log(`   Partition: ${partition}`);
        console.log(`   Offset: ${message.offset}`);
        console.log(`   Timestamp: ${message.timestamp}`);
        console.log(`   Key: ${message.key?.toString() || '(none)'}`);
        console.log(`   Headers: ${JSON.stringify(message.headers)}`);
        console.log('\n📄 RAW VALUE:');
        
        if (message.value) {
          const rawValue = message.value.toString();
          console.log(rawValue);
          
          // Try to parse as JSON
          try {
            const parsed = JSON.parse(rawValue);
            console.log('\n📋 PARSED JSON:');
            console.log(JSON.stringify(parsed, null, 2));
            console.log(`\n   Event type: ${parsed.event || '(no event field)'}`);
          } catch (e) {
            console.log('\n   (Not valid JSON)');
          }
        } else {
          console.log('   (empty)');
        }
        console.log('='.repeat(60) + '\n');
      },
    });

    // Keep running
    console.log('\n💡 Consumer running. Send an SMS to +16463450518 to see messages.');
    console.log('   Press Ctrl+C to stop.\n');

  } catch (error) {
    console.error('❌ Error:', error);
    await consumer.disconnect();
    process.exit(1);
  }

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down...');
    await consumer.disconnect();
    console.log('👋 Goodbye!');
    process.exit(0);
  });
}

debugConsumer();
