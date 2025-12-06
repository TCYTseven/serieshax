/**
 * Test script for Supabase services
 */
import dotenv from 'dotenv';
dotenv.config();

import { isSupabaseConfigured } from './config/supabase';
import * as userService from './services/userService';
import * as conversationService from './services/conversationService';
import * as spotService from './services/spotService';
import * as vibeService from './services/vibeService';

const TEST_PHONE = '+15551234567';
const TEST_CITY = 'new york';

async function runTests() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           🧪 SUPABASE SERVICES TEST                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  // Check Supabase configuration
  console.log('📋 Checking Supabase configuration...');
  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase is not configured! Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }
  console.log('✅ Supabase is configured\n');

  let testUserId: string | null = null;
  let testConversationId: string | null = null;

  // Test 1: User Service
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📝 TEST 1: User Service');
  console.log('═══════════════════════════════════════════════════════════');
  
  try {
    console.log(`\n1.1 Creating/getting user with phone: ${TEST_PHONE}`);
    const user = await userService.getOrCreateUser(TEST_PHONE);
    testUserId = user.id;
    console.log('✅ User:', {
      id: user.id,
      phone_number: user.phone_number,
      is_active: user.is_active,
    });

    console.log('\n1.2 Getting user profile...');
    const profile = await userService.getUserProfile(user.id);
    if (profile) {
      console.log('✅ Profile:', {
        id: profile.id,
        display_name: profile.display_name,
        city: profile.city,
        vibe_tags: profile.vibe_tags,
      });
    } else {
      console.log('ℹ️ No profile found (this is okay for new users)');
    }

    console.log('\n1.3 Updating profile...');
    const updatedProfile = await userService.updateUserProfile(user.id, {
      display_name: 'Test User',
      city: 'New York',
    });
    console.log('✅ Updated profile:', {
      display_name: updatedProfile.display_name,
      city: updatedProfile.city,
    });

  } catch (error) {
    console.error('❌ User Service Error:', error);
  }

  // Test 2: Conversation Service
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📝 TEST 2: Conversation Service');
  console.log('═══════════════════════════════════════════════════════════');

  if (testUserId) {
    try {
      console.log('\n2.1 Creating/getting conversation...');
      const conversation = await conversationService.getOrCreateConversation(testUserId);
      testConversationId = conversation.id;
      console.log('✅ Conversation:', {
        id: conversation.id,
        current_intent: conversation.current_intent,
      });

      console.log('\n2.2 Adding messages...');
      await conversationService.addMessage(conversation.id, 'user', 'Hello Oracle!');
      await conversationService.addMessage(conversation.id, 'assistant', 'Hello! How can I help you today?');
      console.log('✅ Messages added');

      console.log('\n2.3 Getting conversation history...');
      const history = await conversationService.getConversationHistory(conversation.id);
      console.log(`✅ Found ${history.length} messages:`);
      history.forEach((msg, i) => {
        console.log(`   ${i + 1}. [${msg.role}]: ${msg.content.substring(0, 50)}...`);
      });

    } catch (error) {
      console.error('❌ Conversation Service Error:', error);
    }
  }

  // Test 3: Spot Service
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📝 TEST 3: Spot Service');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    console.log(`\n3.1 Searching spots in ${TEST_CITY}...`);
    const spots = await spotService.searchSpots(TEST_CITY, {});
    console.log(`✅ Found ${spots.length} spots`);
    if (spots.length > 0) {
      console.log('   First spot:', {
        name: spots[0].name,
        city: spots[0].city,
        spot_type: spots[0].spot_type,
      });
    } else {
      console.log('ℹ️ No spots in database yet - this is normal for a new project');
    }

  } catch (error) {
    console.error('❌ Spot Service Error:', error);
  }

  // Test 4: Vibe Service
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📝 TEST 4: Vibe Service');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    console.log(`\n4.1 Getting trending topics in ${TEST_CITY}...`);
    const trending = await vibeService.getTrendingTopics(TEST_CITY);
    console.log(`✅ Found ${trending.length} trending topics`);
    if (trending.length > 0) {
      trending.slice(0, 3).forEach(vibe => {
        console.log(`   - ${vibe.topic}: sentiment=${vibe.avg_sentiment}, trending=${vibe.trending_score}`);
      });
    } else {
      console.log('ℹ️ No trending topics yet - this is normal for a new project');
    }

    console.log(`\n4.2 Getting city sentiment summary for ${TEST_CITY}...`);
    const summary = await vibeService.getCitySentimentSummary(TEST_CITY);
    console.log('✅ City summary:', {
      totalTopics: summary.totalTopics,
      totalOpinions: summary.totalOpinions,
      avgSentiment: summary.avgSentiment,
    });

  } catch (error) {
    console.error('❌ Vibe Service Error:', error);
  }

  // Summary
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           ✅ ALL TESTS COMPLETED                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('📊 Test Data Created:');
  if (testUserId) console.log(`   • User ID: ${testUserId}`);
  if (testConversationId) console.log(`   • Conversation ID: ${testConversationId}`);
  console.log('');

  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test runner error:', err);
  process.exit(1);
});
