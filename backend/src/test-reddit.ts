/**
 * Test Reddit Live API Integration
 * 
 * This file tests the Reddit integration with LIVE API calls.
 * Run with: npx ts-node src/test-reddit.ts
 */

import {
  getRedditContext,
  findHiddenGems,
  getLocalSentiment,
  getTrendingTopics,
  getSpotRedditData,
  getPersonalizedRecommendations,
  isCitySupported,
  getSupportedCities,
  clearRedditCache,
} from './integrations/reddit';

// ============================================================================
// TESTS
// ============================================================================

async function runTests() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           📱 REDDIT LIVE API INTEGRATION TEST             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('⚠️  This test makes REAL API calls to Reddit!');
  console.log('');

  // Clear cache before testing
  clearRedditCache();

  // Test 1: Supported cities
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TEST 1: Supported Cities');
  console.log('═══════════════════════════════════════════════════════════');
  const cities = getSupportedCities();
  console.log('Supported cities:', cities.slice(0, 10).join(', '), '...');
  console.log(`Total: ${cities.length} cities`);
  console.log(`NYC supported: ${isCitySupported('nyc')}`);
  console.log(`New York supported: ${isCitySupported('new york')}`);
  console.log(`Random City supported: ${isCitySupported('random city')}`);
  console.log('');

  // Test 2: Basic Reddit context (NYC)
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TEST 2: Get Reddit Context (NYC, general)');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    const nycContext = await getRedditContext('NYC');
    console.log('\n📊 Results:');
    console.log(`   City: ${nycContext.city}`);
    console.log(`   Sentiment: ${nycContext.sentiment} (${nycContext.sentimentScore})`);
    console.log(`   Summary: ${nycContext.summary}`);
    console.log(`   Top Posts: ${nycContext.topPosts.length}`);
    nycContext.topPosts.slice(0, 3).forEach((post, i) => {
      console.log(`      ${i + 1}. ${post.title.substring(0, 60)}... (${post.score} pts)`);
    });
    console.log(`   Hidden Gems: ${nycContext.hiddenGems.length}`);
    nycContext.hiddenGems.slice(0, 3).forEach(gem => {
      console.log(`      - ${gem.name} (${gem.type})`);
    });
    console.log(`   Local Buzz: ${nycContext.localBuzz.length} topics`);
    nycContext.localBuzz.slice(0, 3).forEach(buzz => {
      console.log(`      - ${buzz.substring(0, 60)}...`);
    });
  } catch (error) {
    console.error('   ❌ Error:', error);
  }
  console.log('');

  // Test 3: Reddit context with topic
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TEST 3: Get Reddit Context (NYC, "best bars")');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    const barsContext = await getRedditContext('NYC', { 
      topic: 'best bars',
      includeHiddenGems: true 
    });
    console.log('\n📊 Results:');
    console.log(`   City: ${barsContext.city}`);
    console.log(`   Topic: ${barsContext.topic}`);
    console.log(`   Sentiment: ${barsContext.sentiment} (${barsContext.sentimentScore})`);
    console.log(`   Summary: ${barsContext.summary}`);
    console.log(`   Top Posts: ${barsContext.topPosts.length}`);
    barsContext.topPosts.slice(0, 3).forEach((post, i) => {
      console.log(`      ${i + 1}. ${post.title.substring(0, 60)}...`);
    });
    console.log(`   Hidden Gems: ${barsContext.hiddenGems.length}`);
    barsContext.hiddenGems.slice(0, 5).forEach(gem => {
      console.log(`      - ${gem.name} (${gem.type}): ${gem.reason.substring(0, 50)}...`);
    });
  } catch (error) {
    console.error('   ❌ Error:', error);
  }
  console.log('');

  // Test 4: Find hidden gems
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TEST 4: Find Hidden Gems (NYC, "restaurant")');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    const gems = await findHiddenGems('NYC', 'restaurant');
    console.log(`\n🍕 Found ${gems.length} Restaurant Hidden Gems:`);
    gems.slice(0, 5).forEach((gem, i) => {
      console.log(`   ${i + 1}. ${gem.name} (${gem.type})`);
      console.log(`      Reason: ${gem.reason.substring(0, 70)}...`);
      console.log(`      Source: ${gem.sourcePost}`);
    });
  } catch (error) {
    console.error('   ❌ Error:', error);
  }
  console.log('');

  // Test 5: Get spot-specific data
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TEST 5: Get Spot Reddit Data (Joe\'s Pizza, NYC)');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    const spotData = await getSpotRedditData("Joe's Pizza", 'NYC', 'pizza');
    console.log('\n🍕 Spot Data:');
    console.log(`   Name: ${spotData.spotName}`);
    console.log(`   Sentiment: ${spotData.sentiment} (${spotData.sentimentScore})`);
    console.log(`   Mentions: ${spotData.mentionCount}`);
    console.log(`   Summary: ${spotData.summary}`);
    if (spotData.recommendations.length > 0) {
      console.log(`   Top Recommendation: "${spotData.recommendations[0].substring(0, 80)}..."`);
    }
    if (spotData.recentMentions.length > 0) {
      console.log(`   Recent Mentions:`);
      spotData.recentMentions.slice(0, 2).forEach(mention => {
        console.log(`      - ${mention.title.substring(0, 50)}... (${mention.score} pts)`);
      });
    }
  } catch (error) {
    console.error('   ❌ Error:', error);
  }
  console.log('');

  // Test 6: Get local sentiment
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TEST 6: Get Local Sentiment (NYC, "subway")');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    const sentiment = await getLocalSentiment('NYC', 'subway');
    console.log(`\n📈 Sentiment Results:`);
    console.log(`   Sentiment: ${sentiment.sentiment}`);
    console.log(`   Score: ${sentiment.score}`);
    console.log(`   Summary: ${sentiment.summary}`);
    console.log(`   Sample posts:`);
    sentiment.samplePosts.slice(0, 3).forEach(post => {
      console.log(`      - ${post.substring(0, 60)}...`);
    });
  } catch (error) {
    console.error('   ❌ Error:', error);
  }
  console.log('');

  // Test 7: Get trending topics
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TEST 7: Get Trending Topics (San Francisco)');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    const trending = await getTrendingTopics('San Francisco');
    console.log(`\n🔥 Trending in San Francisco (${trending.length} topics):`);
    trending.slice(0, 5).forEach((topic, i) => {
      console.log(`   ${i + 1}. ${topic}`);
    });
  } catch (error) {
    console.error('   ❌ Error:', error);
  }
  console.log('');

  // Test 8: Personalized recommendations
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TEST 8: Personalized Recommendations (Chicago)');
  console.log('═══════════════════════════════════════════════════════════');
  try {
    const personalized = await getPersonalizedRecommendations('Chicago', {
      vibes: ['chill', 'date night'],
      interests: ['live music'],
      foodPreferences: ['italian'],
    });
    console.log('\n🎯 Personalized Results:');
    console.log(`   City: ${personalized.city}`);
    console.log(`   Topic: ${personalized.topic}`);
    console.log(`   Sentiment: ${personalized.sentiment}`);
    console.log(`   Hidden Gems: ${personalized.hiddenGems.length}`);
    personalized.hiddenGems.slice(0, 3).forEach(gem => {
      console.log(`      - ${gem.name} (${gem.type})`);
    });
  } catch (error) {
    console.error('   ❌ Error:', error);
  }
  console.log('');

  // Test 9: Cache behavior
  console.log('═══════════════════════════════════════════════════════════');
  console.log('TEST 9: Cache Behavior');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Fetching NYC context again (should use cache)...');
  try {
    const start = Date.now();
    const cachedContext = await getRedditContext('NYC');
    const duration = Date.now() - start;
    console.log(`   ✅ Got ${cachedContext.topPosts.length} posts in ${duration}ms (cached)`);
  } catch (error) {
    console.error('   ❌ Error:', error);
  }
  console.log('');

  // Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ ALL TESTS COMPLETED');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('📝 The Reddit integration uses LIVE Reddit data via the public JSON API.');
  console.log('   - Rate limited to 1 request/second');
  console.log('   - Context cached for 10 minutes');
  console.log('   - Spot data cached for 30 minutes');
  console.log('');
}

// Run tests
runTests().catch(console.error);
