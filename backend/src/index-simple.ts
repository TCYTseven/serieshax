/**
 * Simple Entry Point - Back to Basics
 * Uses unique consumer group like the starter code
 */

import { simpleConsumer } from './kafka/consumer-simple';
import { OracleAgent, createOracleAgent } from './oracle';

console.log('');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║           🔮 SOCIAL ORACLE - SIMPLE MODE                  ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');

// Create the Oracle Agent
const oracle = createOracleAgent({
  enablePolymarket: true,
  enableReddit: true,
  enableTypingIndicator: false, // Skip typing to be faster
  maxResponseLength: 320,
  debugMode: true,
});

async function main() {
  console.log('🚀 Starting Simple Consumer...\n');

  // Set handler to use Oracle Agent
  simpleConsumer.setMessageHandler(async (msg) => {
    try {
      await oracle.handleIncomingMessage(msg);
    } catch (err) {
      console.error('❌ Oracle error:', err);
    }
  });

  await simpleConsumer.start();
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️ Shutting down...');
  await simpleConsumer.stop();
  process.exit(0);
});

main().catch(console.error);
