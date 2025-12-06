import { seriesProducer } from './producer';

/**
 * Test script to send a message via the Kafka producer
 * 
 * Usage: npm run test:producer
 * 
 * This will send a test message to verify the producer is working correctly.
 */

async function testProducer(): Promise<void> {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           📤 KAFKA PRODUCER TEST                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  // Get phone number from command line args or use a test number
  const testPhoneNumber = process.argv[2] || '+1234567890';
  const testMessage = process.argv[3] || 'Hello from Social Oracle! 🔮';

  console.log(`📱 Test phone number: ${testPhoneNumber}`);
  console.log(`💬 Test message: ${testMessage}`);
  console.log('');

  try {
    // Connect and send
    await seriesProducer.connect();
    await seriesProducer.sendMessage(testPhoneNumber, testMessage);
    
    console.log('\n✅ Test completed successfully!');
    console.log('');
    console.log('📝 Note: Replace the phone number with a real number to test SMS delivery');
    console.log('   Usage: npm run test:producer "+1234567890" "Your message here"');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await seriesProducer.disconnect();
  }

  process.exit(0);
}

testProducer();
