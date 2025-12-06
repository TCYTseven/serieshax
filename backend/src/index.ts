import { seriesConsumer } from './kafka/consumer';
import { seriesProducer } from './kafka/producer';
import { kafkaConfig } from './config/kafka';

/**
 * Social Oracle Backend Entry Point
 * 
 * This service connects to Series via Kafka to process incoming SMS messages
 * and send responses back to users.
 */

console.log('');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║           🔮 SOCIAL ORACLE BACKEND                        ║');
console.log('║           Series Hackathon - Kafka SMS Service            ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');

/**
 * Main application startup
 */
async function main(): Promise<void> {
  console.log('🚀 Starting Social Oracle Backend...\n');

  // Set up a simple message handler that logs and echoes back
  seriesConsumer.setMessageHandler(async (message) => {
    console.log(`\n🔮 Processing message from ${message.from}:`);
    console.log(`   "${message.body}"`);
    
    // For now, just log that we received a message
    // In Phase 3.2, we'll add actual message processing logic
    console.log('   [Message handler placeholder - implement in Phase 3.2]');
    
    // Example: Echo back for testing (uncomment to enable)
    // await seriesProducer.sendMessage(
    //   message.from,
    //   `Echo: ${message.body}`
    // );
  });

  try {
    // Connect the producer first (so it's ready to send responses)
    await seriesProducer.connect();

    // Start the consumer
    await seriesConsumer.start();

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Social Oracle Backend is running!');
    console.log(`📞 Listening for SMS on: ${kafkaConfig.senderNumber}`);
    console.log(`📡 Kafka topic: ${kafkaConfig.topic}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n💡 Send an SMS to the number above to test!\n');

  } catch (error) {
    console.error('❌ Fatal error during startup:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string): Promise<void> {
  console.log(`\n⚠️ Received ${signal}, shutting down gracefully...`);
  
  try {
    await seriesConsumer.stop();
    await seriesProducer.disconnect();
    console.log('👋 Goodbye!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection');
});

// Start the application
main();
