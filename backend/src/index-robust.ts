/**
 * Social Oracle Backend Entry Point (Robust Version)
 * 
 * Uses the robust consumer that:
 * - Filters old messages (only processes messages from last 5 minutes)
 * - Deduplicates messages
 * - Uses stable consumer group for proper offset tracking
 * - Has processing queue with concurrency control
 */

import { robustConsumer } from './kafka/consumer-robust';
import { kafkaConfig } from './config/kafka';
import { isSupabaseConfigured } from './config/supabase';
import { isOpenAIConfigured } from './services';
import { isSeriesApiConfigured } from './services/seriesApi-robust';
import { OracleAgent, createOracleAgent } from './oracle';

console.log('');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║           🔮 SOCIAL ORACLE BACKEND                        ║');
console.log('║           Robust Consumer Mode                            ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');

// Create the Oracle Agent
const oracle = createOracleAgent({
  enablePolymarket: true,
  enableReddit: true,
  enableTypingIndicator: true,
  maxResponseLength: 320,
  debugMode: process.env.NODE_ENV === 'development',
});

/**
 * Main application startup
 */
async function main(): Promise<void> {
  console.log('🚀 Starting Social Oracle Backend (Robust Mode)...\n');

  // Log configuration status
  console.log('📋 Configuration:');
  console.log(`   Supabase: ${isSupabaseConfigured() ? '✅ Configured' : '⚠️ Not configured'}`);
  console.log(`   OpenAI: ${isOpenAIConfigured() ? '✅ Configured' : '⚠️ Not configured (using fallback)'}`);
  console.log(`   Series API: ${isSeriesApiConfigured() ? '✅ Configured' : '❌ NOT CONFIGURED'}`);
  console.log('');

  console.log('🛡️ Robust Consumer Features:');
  console.log('   ✓ Filters messages older than 5 minutes');
  console.log('   ✓ Deduplicates messages (1 hour window)');
  console.log('   ✓ Stable consumer group (proper offset tracking)');
  console.log('   ✓ Processing queue with concurrency: 1');
  console.log('   ✓ Retry logic with exponential backoff');
  console.log('');

  if (!isSeriesApiConfigured()) {
    console.log('⚠️  WARNING: SERIES_API_KEY not set. Responses will NOT be sent!');
    console.log('   Add SERIES_API_KEY=your-api-key to your .env file\n');
  }

  // Set up message handler - delegate to Oracle Agent
  robustConsumer.setMessageHandler(async (message) => {
    try {
      await oracle.handleIncomingMessage(message);
    } catch (error) {
      console.error('❌ Error processing message:', error);
      // Don't throw - let consumer continue
    }
  });

  try {
    // Start the consumer
    await robustConsumer.start();

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Social Oracle Backend is running!');
    console.log(`📞 Listening for SMS on: ${kafkaConfig.senderNumber}`);
    console.log(`📡 Kafka topic: ${kafkaConfig.topic}`);
    console.log(`🌐 Sending replies via: Series REST API (with retry)`);
    console.log(`🔮 Oracle Agent: Active`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n💡 Send an SMS to the number above to test!');
    console.log('📊 Stats will be printed every minute and on shutdown.\n');

    // Print stats periodically
    setInterval(() => {
      if (process.env.NODE_ENV === 'development') {
        robustConsumer.printStats();
      }
    }, 60000);

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
    await robustConsumer.stop();
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
  // Don't shutdown on unhandled rejection - just log
});

// Start the application
main();
