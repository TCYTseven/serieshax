/**
 * Test script for the Event Creation Agent
 * Run with: npm run test:event-agent
 */

import { 
  createPersonalizedEvents, 
  OnboardingProfile, 
  SearchFilters 
} from './services/eventCreationAgent';

async function main() {
  console.log('\n🧪 Testing Event Creation Agent\n');
  console.log('═'.repeat(60));

  // Test profile - Alex, a Nets fan in NYC
  const testProfile: OnboardingProfile = {
    name: 'Alex',
    phoneNumber: '1234567890',
    city: 'New York',
    interests: ['Sports', 'Nightlife', 'Food'],
    goals: ['Meet new people', 'Explore the city'],
    sportsTeams: { 
      Basketball: 'Nets',
      Football: 'Giants' 
    },
    foodGenres: ['Italian', 'Japanese', 'Mexican'],
    musicGenres: ['Hip Hop', 'Electronic'],
    sociability: 8,
    vibeTags: ['energetic', 'social_butterfly'],
    age: '28',
  };

  // Test filters
  const testFilters: SearchFilters = {
    people: '4',
    location: 'Brooklyn',
    budget: '$$',
    trendingTopics: true,  // Enable Polymarket
    secretGems: true,      // Enable Reddit
  };

  console.log('\n📋 Test Profile:');
  console.log(`   Name: ${testProfile.name}`);
  console.log(`   City: ${testProfile.city}`);
  console.log(`   Interests: ${testProfile.interests.join(', ')}`);
  console.log(`   Sports Teams: ${JSON.stringify(testProfile.sportsTeams)}`);
  console.log(`   Sociability: ${testProfile.sociability}/10`);
  console.log(`   Vibes: ${testProfile.vibeTags.join(', ')}`);

  console.log('\n🔧 Test Filters:');
  console.log(`   People: ${testFilters.people}`);
  console.log(`   Location: ${testFilters.location}`);
  console.log(`   Budget: ${testFilters.budget}`);
  console.log(`   Polymarket (Trending): ${testFilters.trendingTopics}`);
  console.log(`   Reddit (Secret gems): ${testFilters.secretGems}`);

  console.log('\n' + '═'.repeat(60));
  console.log('🚀 Starting Event Creation Agent...\n');

  try {
    const result = await createPersonalizedEvents(
      testProfile,
      testFilters,
      'sports bar for game night'
    );

    console.log('\n' + '═'.repeat(60));
    console.log('📊 RESULTS\n');

    if (result.success) {
      console.log(`✅ Success! Generated ${result.events.length} events`);
      console.log(`💾 Saved to Supabase: ${result.savedToSupabase}`);
      
      console.log('\n📝 Events Generated:\n');
      
      result.events.forEach((event, index) => {
        console.log(`${index + 1}. ${event.locationName}`);
        console.log(`   Type: ${event.venueType}`);
        console.log(`   Description: ${event.description.substring(0, 100)}...`);
        console.log(`   Vibes: ${event.vibes.join(', ')}`);
        console.log(`   Series Partner: ${event.seriesPartner}`);
        console.log(`   Price: ${event.priceTier} | Distance: ${event.estimatedDistance}`);
        console.log(`   Series Review: ${event.seriesReview.toFixed(1)}/5`);
        
        if (event.polymarketNote) {
          console.log(`   📊 Polymarket: ${event.polymarketNote.notes}`);
        }
        if (event.redditNote) {
          console.log(`   🔍 Reddit: ${event.redditNote.notes}`);
        }
        console.log('');
      });
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }

    console.log('\n📋 Processing Steps:');
    result.processingSteps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step}`);
    });

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🧪 Test Complete\n');
}

main().catch(console.error);

