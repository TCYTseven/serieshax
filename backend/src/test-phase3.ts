/**
 * Phase 3.2 Test Suite
 * Tests all components to verify SMS flow works end-to-end
 */

import { env } from './config/env';

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, error?: string, details?: string) {
  results.push({ name, passed, error, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (details) console.log(`   ${details}`);
  if (error) console.log(`   Error: ${error}`);
}

async function runTests() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           🧪 PHASE 3.2 TEST SUITE                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');

  // ============================================
  // TEST 1: Environment Variables
  // ============================================
  console.log('📋 TEST 1: Environment Variables\n');

  // Kafka Config
  logTest(
    'KAFKA_BOOTSTRAP_SERVERS',
    !!env.KAFKA_BOOTSTRAP_SERVERS,
    !env.KAFKA_BOOTSTRAP_SERVERS ? 'Missing' : undefined,
    env.KAFKA_BOOTSTRAP_SERVERS ? `Set to: ${env.KAFKA_BOOTSTRAP_SERVERS.substring(0, 30)}...` : undefined
  );

  logTest(
    'KAFKA_TOPIC',
    !!env.KAFKA_TOPIC,
    !env.KAFKA_TOPIC ? 'Missing' : undefined,
    env.KAFKA_TOPIC ? `Set to: ${env.KAFKA_TOPIC.substring(0, 30)}...` : undefined
  );

  logTest(
    'KAFKA_CONSUMER_GROUP',
    !!env.KAFKA_CONSUMER_GROUP,
    !env.KAFKA_CONSUMER_GROUP ? 'Missing' : undefined
  );

  logTest(
    'KAFKA_SASL_USERNAME',
    !!env.KAFKA_SASL_USERNAME,
    !env.KAFKA_SASL_USERNAME ? 'Missing' : undefined
  );

  logTest(
    'KAFKA_SASL_PASSWORD',
    !!env.KAFKA_SASL_PASSWORD,
    !env.KAFKA_SASL_PASSWORD ? 'Missing' : undefined,
    env.KAFKA_SASL_PASSWORD ? 'Set (hidden)' : undefined
  );

  logTest(
    'SERIES_SENDER_NUMBER',
    !!env.SERIES_SENDER_NUMBER,
    !env.SERIES_SENDER_NUMBER ? 'Missing' : undefined,
    env.SERIES_SENDER_NUMBER ? `Set to: ${env.SERIES_SENDER_NUMBER}` : undefined
  );

  // Supabase Config
  logTest(
    'SUPABASE_URL',
    !!env.SUPABASE_URL,
    !env.SUPABASE_URL ? 'Missing (optional but needed for user data)' : undefined,
    env.SUPABASE_URL ? `Set to: ${env.SUPABASE_URL}` : undefined
  );

  logTest(
    'SUPABASE_SERVICE_ROLE_KEY',
    !!env.SUPABASE_SERVICE_ROLE_KEY,
    !env.SUPABASE_SERVICE_ROLE_KEY ? 'Missing (optional but needed for user data)' : undefined,
    env.SUPABASE_SERVICE_ROLE_KEY ? 'Set (hidden)' : undefined
  );

  // OpenAI Config
  logTest(
    'OPENAI_API_KEY',
    !!env.OPENAI_API_KEY,
    !env.OPENAI_API_KEY ? 'Missing (optional, fallback responses will be used)' : undefined,
    env.OPENAI_API_KEY ? 'Set (hidden)' : undefined
  );

  console.log('\n');

  // ============================================
  // TEST 2: Kafka Connection
  // ============================================
  console.log('📋 TEST 2: Kafka Connection\n');

  try {
    const { kafka } = await import('./config/kafka');
    const admin = kafka.admin();
    
    console.log('   Connecting to Kafka...');
    await admin.connect();
    logTest('Kafka Admin Connection', true, undefined, 'Successfully connected');

    // Try to list topics
    const topics = await admin.listTopics();
    const topicExists = topics.includes(env.KAFKA_TOPIC);
    logTest(
      'Topic Exists',
      topicExists,
      !topicExists ? `Topic "${env.KAFKA_TOPIC}" not found in cluster` : undefined,
      topicExists ? `Found topic: ${env.KAFKA_TOPIC}` : `Available topics: ${topics.slice(0, 5).join(', ')}...`
    );

    await admin.disconnect();
  } catch (error: any) {
    logTest('Kafka Connection', false, error.message);
  }

  console.log('\n');

  // ============================================
  // TEST 3: Supabase Connection
  // ============================================
  console.log('📋 TEST 3: Supabase Connection\n');

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    logTest('Supabase Configuration', false, 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  } else {
    try {
      const { getSupabaseClient } = await import('./config/supabase');
      const supabase = getSupabaseClient();
      
      // Test connection by querying users table
      const { data, error } = await supabase.from('users').select('id').limit(1);
      
      if (error) {
        logTest('Supabase Query', false, error.message);
      } else {
        logTest('Supabase Connection', true, undefined, 'Successfully connected and queried');
      }
    } catch (error: any) {
      logTest('Supabase Connection', false, error.message);
    }
  }

  console.log('\n');

  // ============================================
  // TEST 4: OpenAI Connection
  // ============================================
  console.log('📋 TEST 4: OpenAI Connection\n');

  if (!env.OPENAI_API_KEY) {
    logTest('OpenAI Configuration', false, 'Missing OPENAI_API_KEY - using fallback responses');
  } else {
    try {
      const { isOpenAIConfigured, generateResponse } = await import('./services/oracleService');
      
      logTest('OpenAI Configured', isOpenAIConfigured(), undefined);

      // Test a simple generation
      console.log('   Testing OpenAI response generation...');
      const response = await generateResponse('Hello, what can you help me with?', []);
      logTest(
        'OpenAI Response Generation',
        response.length > 0,
        response.length === 0 ? 'Empty response' : undefined,
        `Response: "${response.substring(0, 50)}..."`
      );
    } catch (error: any) {
      logTest('OpenAI Connection', false, error.message);
    }
  }

  console.log('\n');

  // ============================================
  // TEST 5: Service Functions
  // ============================================
  console.log('📋 TEST 5: Service Functions\n');

  try {
    const { detectIntent, extractCity, generateWelcomeMessage } = await import('./services/oracleService');
    const { isRateLimited, recordRequest, clearRateLimit } = await import('./services/rateLimiter');

    // Test intent detection
    const intent1 = await detectIntent('I want to grab some drinks tonight');
    logTest('Intent Detection (drink)', intent1 === 'drink', undefined, `Detected: ${intent1}`);

    const intent2 = await detectIntent('Looking to meet new people');
    logTest('Intent Detection (meet)', intent2 === 'meet', undefined, `Detected: ${intent2}`);

    // Test city extraction
    const city1 = extractCity('Find me a bar in Brooklyn', null);
    logTest('City Extraction', city1 === 'Brooklyn', undefined, `Extracted: ${city1}`);

    // Test rate limiter
    const testPhone = '+1234567890';
    clearRateLimit(testPhone);
    
    logTest('Rate Limiter (not limited)', !isRateLimited(testPhone));
    
    // Record 11 requests (should exceed limit)
    for (let i = 0; i < 11; i++) {
      recordRequest(testPhone);
    }
    logTest('Rate Limiter (limited after 11 requests)', isRateLimited(testPhone));
    
    clearRateLimit(testPhone);

    // Test welcome message
    const welcome = generateWelcomeMessage('John');
    logTest('Welcome Message Generation', welcome.includes('John'), undefined, `Message: "${welcome}"`);

  } catch (error: any) {
    logTest('Service Functions', false, error.message);
  }

  console.log('\n');

  // ============================================
  // TEST 6: Producer Test
  // ============================================
  console.log('📋 TEST 6: Kafka Producer\n');

  try {
    const { seriesProducer } = await import('./kafka/producer');
    
    console.log('   Connecting producer...');
    await seriesProducer.connect();
    logTest('Producer Connection', true, undefined, 'Successfully connected');

    // Note: We won't actually send a message in tests to avoid spamming
    logTest('Producer Ready', seriesProducer.isProducerConnected());

    await seriesProducer.disconnect();
  } catch (error: any) {
    logTest('Producer Connection', false, error.message);
  }

  console.log('\n');

  // ============================================
  // SUMMARY
  // ============================================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`   Total:  ${total}`);
  console.log(`   Passed: ${passed} ✅`);
  console.log(`   Failed: ${failed} ❌`);
  console.log(`   Rate:   ${Math.round((passed / total) * 100)}%`);

  console.log('\n');

  if (failed > 0) {
    console.log('❌ FAILED TESTS:\n');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
    console.log('\n');
  }

  // Recommendations
  console.log('💡 RECOMMENDATIONS:\n');

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('   1. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env for user data persistence');
  }

  if (!env.OPENAI_API_KEY) {
    console.log('   2. Add OPENAI_API_KEY to .env for AI-powered responses (otherwise fallback used)');
  }

  const kafkaFailed = results.find(r => r.name.includes('Kafka') && !r.passed);
  if (kafkaFailed) {
    console.log('   3. Check your Kafka credentials - make sure KAFKA_SASL_PASSWORD is the API Secret');
  }

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);
