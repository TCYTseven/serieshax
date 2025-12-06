/**
 * Polymarket Integration Test
 * Tests the Polymarket MCP integration
 */

import { 
  getPolymarketContext, 
  getSportsEventPrediction,
  clearPolymarketCache 
} from './integrations/polymarket';

async function testPolymarket() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           📊 POLYMARKET INTEGRATION TEST                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');

  // Clear cache for fresh tests
  clearPolymarketCache();

  // Test 1: Knicks context
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TEST 1: Get context for "Knicks"');
  console.log('═══════════════════════════════════════════════════════════\n');

  const knicksContext = await getPolymarketContext('Knicks');
  console.log('Topic:', knicksContext.topic);
  console.log('Markets found:', knicksContext.markets.length);
  console.log('Trending Score:', knicksContext.trendingScore);
  
  if (knicksContext.markets.length > 0) {
    console.log('\nMarkets:');
    knicksContext.markets.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.question}`);
      console.log(`     Probability: ${(m.probability * 100).toFixed(1)}%`);
      console.log(`     Volume: $${m.volume.toLocaleString()}`);
      console.log(`     Is Hot: ${m.isHot ? '🔥 Yes' : 'No'}`);
    });
  }
  
  if (knicksContext.topPrediction) {
    console.log('\nTop Prediction:');
    console.log(`  Question: ${knicksContext.topPrediction.question}`);
    console.log(`  Probability: ${(knicksContext.topPrediction.probability * 100).toFixed(1)}%`);
    console.log(`  Confidence: ${knicksContext.topPrediction.confidence}`);
  }
  
  if (knicksContext.sportsPrediction) {
    console.log('\nSports Prediction:');
    console.log(`  Event: ${knicksContext.sportsPrediction.event}`);
    console.log(`  Favored: ${knicksContext.sportsPrediction.favored}`);
    console.log(`  Probability: ${(knicksContext.sportsPrediction.probability * 100).toFixed(1)}%`);
    console.log(`  Underdog: ${knicksContext.sportsPrediction.underdog}`);
  }
  
  if (knicksContext.suggestedIcebreaker) {
    console.log('\n💬 Suggested Icebreaker:');
    console.log(`  "${knicksContext.suggestedIcebreaker}"`);
  }

  // Test 2: Bitcoin context
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('TEST 2: Get context for "Bitcoin"');
  console.log('═══════════════════════════════════════════════════════════\n');

  const btcContext = await getPolymarketContext('Bitcoin');
  console.log('Topic:', btcContext.topic);
  console.log('Markets found:', btcContext.markets.length);
  console.log('Trending Score:', btcContext.trendingScore);
  
  if (btcContext.topPrediction) {
    console.log('\nTop Prediction:');
    console.log(`  Question: ${btcContext.topPrediction.question}`);
    console.log(`  Probability: ${(btcContext.topPrediction.probability * 100).toFixed(1)}%`);
    console.log(`  Confidence: ${btcContext.topPrediction.confidence}`);
  }
  
  if (btcContext.suggestedIcebreaker) {
    console.log('\n💬 Suggested Icebreaker:');
    console.log(`  "${btcContext.suggestedIcebreaker}"`);
  }

  // Test 3: No matches
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('TEST 3: Get context for "Quantum Computing" (no matches)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const noMatchContext = await getPolymarketContext('Quantum Computing');
  console.log('Topic:', noMatchContext.topic);
  console.log('Markets found:', noMatchContext.markets.length);
  console.log('Trending Score:', noMatchContext.trendingScore);
  console.log('Top Prediction:', noMatchContext.topPrediction);

  // Test 4: Sports prediction helper
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('TEST 4: Get sports prediction for "Knicks vs Celtics"');
  console.log('═══════════════════════════════════════════════════════════\n');

  const sportsPred = await getSportsEventPrediction('Knicks', 'Celtics');
  if (sportsPred) {
    console.log('Event:', sportsPred.event);
    console.log('Favored:', sportsPred.favored);
    console.log('Probability:', (sportsPred.probability * 100).toFixed(1) + '%');
    console.log('Underdog:', sportsPred.underdog);
    console.log('\n💬 Icebreaker:');
    console.log(`  "${sportsPred.icebreaker}"`);
  } else {
    console.log('No sports prediction found');
  }

  // Test 5: Cache test
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('TEST 5: Cache test (should use cached result)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const cachedContext = await getPolymarketContext('Knicks');
  console.log('Got cached result for Knicks');
  console.log('Markets found:', cachedContext.markets.length);

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ ALL TESTS COMPLETED');
  console.log('═══════════════════════════════════════════════════════════\n');
}

testPolymarket().catch(console.error);
