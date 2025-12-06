/**
 * Test script for Oracle Agent
 * Tests intent classification, context building, and response generation
 */

import dotenv from 'dotenv';
dotenv.config();

import { 
  classifyIntent, 
  extractTopics, 
  detectSportsTeams,
  needsPolymarketContext,
  needsRedditContext 
} from './oracle/intentClassifier';
import { 
  buildEntities, 
  extractCity, 
  extractTimeframe, 
  extractVibes 
} from './oracle/contextBuilder';
import { OracleAgent, createOracleAgent } from './oracle';
import { isSupabaseConfigured } from './config/supabase';
import { isOpenAIConfigured } from './services';

console.log('');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║           🧪 ORACLE AGENT TEST                            ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');

// Test messages
const TEST_MESSAGES = [
  // Greetings
  { msg: "Hey!", expected: "greeting" },
  { msg: "Hello there", expected: "greeting" },
  
  // Help
  { msg: "What can you do?", expected: "help" },
  { msg: "Help me out", expected: "help" },
  
  // Meet
  { msg: "I want to meet new people", expected: "meet" },
  { msg: "Help me find people to watch the Knicks game", expected: "meet" },
  { msg: "Looking for a squad", expected: "meet" },
  
  // Drink
  { msg: "Where should I grab drinks tonight?", expected: "drink" },
  { msg: "Best cocktail bars in NYC", expected: "drink" },
  { msg: "I need a beer", expected: "drink" },
  
  // Learn
  { msg: "Pottery classes near me", expected: "learn" },
  { msg: "Where can I learn to cook?", expected: "learn" },
  { msg: "Any good workshops this weekend?", expected: "learn" },
  
  // Explore
  { msg: "What's happening in NYC tonight?", expected: "explore" },
  { msg: "Hidden gems in Brooklyn", expected: "explore" },
  { msg: "Things to do", expected: "explore" },
  
  // Vibe check
  { msg: "What's the vibe for Knicks tonight?", expected: "vibe_check" },
  { msg: "How's the energy at MSG?", expected: "vibe_check" },
  { msg: "Is it lit downtown?", expected: "vibe_check" },
  
  // Reflection
  { msg: "Loved that bar last night!", expected: "reflection" },
  { msg: "The meetup was great", expected: "reflection" },
  { msg: "That spot was mid", expected: "reflection" },
  
  // General
  { msg: "Random message here", expected: "general" },
  { msg: "Thanks!", expected: "general" },
];

async function runTests() {
  console.log('📋 Configuration:');
  console.log(`   Supabase: ${isSupabaseConfigured() ? '✅' : '⚠️'}`);
  console.log(`   OpenAI: ${isOpenAIConfigured() ? '✅' : '⚠️'}`);
  console.log('');

  // Test 1: Intent Classification
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📝 TEST 1: Intent Classification');
  console.log('═══════════════════════════════════════════════════════════\n');

  let correct = 0;
  let total = TEST_MESSAGES.length;

  for (const test of TEST_MESSAGES) {
    const result = classifyIntent(test.msg);
    const passed = result.intent === test.expected;
    if (passed) correct++;
    
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} "${test.msg.substring(0, 40).padEnd(40)}" → ${result.intent} (expected: ${test.expected})`);
  }

  console.log(`\n📊 Intent Classification: ${correct}/${total} correct (${Math.round(correct/total*100)}%)\n`);

  // Test 2: Entity Extraction
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📝 TEST 2: Entity Extraction');
  console.log('═══════════════════════════════════════════════════════════\n');

  const entityTests = [
    "Looking for bars in Brooklyn tonight",
    "Knicks game watch party in Manhattan this weekend",
    "Best coffee shops near San Francisco",
    "I want something chill and laid back in LA",
    "Where can I watch the Lakers vs Celtics?",
  ];

  for (const msg of entityTests) {
    console.log(`\n📨 "${msg}"`);
    
    const city = extractCity(msg, null);
    const timeframe = extractTimeframe(msg);
    const vibes = extractVibes(msg);
    const teams = detectSportsTeams(msg);
    const topics = extractTopics(msg);
    
    console.log(`   📍 City: ${city}`);
    if (timeframe) console.log(`   ⏰ Timeframe: ${timeframe}`);
    if (vibes.length) console.log(`   🎯 Vibes: ${vibes.join(', ')}`);
    if (teams.length) console.log(`   🏀 Teams: ${teams.join(', ')}`);
    if (topics.length) console.log(`   📌 Topics: ${topics.join(', ')}`);
  }

  // Test 3: Context Requirements
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📝 TEST 3: Context Requirements');
  console.log('═══════════════════════════════════════════════════════════\n');

  const contextTests = [
    "What are the odds for the Knicks game?",
    "Hidden gems in Brooklyn",
    "Best bars",
    "What's the vibe at MSG tonight?",
  ];

  for (const msg of contextTests) {
    const result = classifyIntent(msg);
    const needsPolymarket = needsPolymarketContext(result.intent, msg);
    const needsReddit = needsRedditContext(result.intent, msg);
    
    console.log(`"${msg}"`);
    console.log(`   Intent: ${result.intent}`);
    console.log(`   Needs Polymarket: ${needsPolymarket ? '✅' : '❌'}`);
    console.log(`   Needs Reddit: ${needsReddit ? '✅' : '❌'}`);
    console.log('');
  }

  // Test 4: Oracle Agent (if Supabase is configured)
  if (isSupabaseConfigured()) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📝 TEST 4: Oracle Agent Message Processing');
    console.log('═══════════════════════════════════════════════════════════\n');

    const oracle = createOracleAgent({ debugMode: true });
    
    const testPhone = '+15551234567';
    const testMessages = [
      "Hey there!",
      "What can you help me with?",
      "Best bars in NYC",
    ];

    for (const msg of testMessages) {
      console.log(`\n📨 Processing: "${msg}"`);
      try {
        const response = await oracle.processMessage(testPhone, msg, `test-${Date.now()}`);
        console.log(`   ✅ Intent: ${response.intent}`);
        console.log(`   ✅ Response: "${response.text.substring(0, 100)}..."`);
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
  } else {
    console.log('⚠️  Skipping Test 4 (Oracle Agent) - Supabase not configured\n');
  }

  // Summary
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           ✅ ORACLE TESTS COMPLETED                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test error:', err);
  process.exit(1);
});
