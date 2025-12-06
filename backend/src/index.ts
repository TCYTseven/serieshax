import { seriesConsumer } from './kafka/consumer';
import { kafkaConfig } from './config/kafka';
import { isSupabaseConfigured } from './config/supabase';
import { startServer } from './server';
import { env } from './config/env';
import {
  getOrCreateUser,
  getUserProfile,
  getOrCreateConversation,
  addMessage,
  getConversationHistory,
  searchSpots,
  getSpotsForVibes,
  generateResponse,
  generateResponseWithPredictions,
  detectIntent,
  detectPredictionTopic,
  extractCity,
  generateWelcomeMessage,
  isOpenAIConfigured,
  isRateLimited,
  recordRequest,
  getRateLimitMessage,
  getPolymarketContext,
} from './services';
import { 
  sendMessageToChat, 
  createChatAndSendMessage,
  startTypingIndicator,
  stopTypingIndicator,
  isSeriesApiConfigured 
} from './services/seriesApi';
import { ParsedIncomingMessage } from './kafka/types';

/**
 * Social Oracle Backend Entry Point
 * 
 * This service connects to Series via Kafka to receive incoming messages
 * and uses the Series REST API to send responses back to users.
 */

console.log('');
console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║           🔮 SOCIAL ORACLE BACKEND                        ║');
console.log('║           Series Hackathon - Kafka + REST API             ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');

/**
 * Process an incoming message and generate a response
 */
async function generateMessageResponse(
  phoneNumber: string,
  messageBody: string,
  messageId: string
): Promise<string> {
  console.log(`\n🔮 Processing message from ${phoneNumber}:`);
  console.log(`   "${messageBody}"`);

  // Check rate limit
  if (isRateLimited(phoneNumber)) {
    console.log('   ⚠️ Rate limited');
    return getRateLimitMessage();
  }
  recordRequest(phoneNumber);

  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.log('   ⚠️ Supabase not configured, using basic response');
      return generateResponse(messageBody);
    }

    // Get or create user
    const user = await getOrCreateUser(phoneNumber);
    console.log(`   👤 User: ${user.id}`);

    // Get user profile
    const profile = await getUserProfile(user.id);

    // Get or create conversation
    const conversation = await getOrCreateConversation(user.id, messageId);
    console.log(`   💬 Conversation: ${conversation.id}`);

    // Save user message
    await addMessage(conversation.id, 'user', messageBody);

    // Get conversation history for context
    const history = await getConversationHistory(conversation.id, 10);

    // Detect intent
    const intent = await detectIntent(messageBody);
    console.log(`   🎯 Intent: ${intent}`);

    // Extract city from message or profile
    const city = extractCity(messageBody, profile);
    console.log(`   📍 City: ${city}`);

    // Get relevant spots based on intent and profile
    let spots: Awaited<ReturnType<typeof searchSpots>> = [];
    try {
      if (profile?.vibe_tags && profile.vibe_tags.length > 0) {
        spots = await getSpotsForVibes(profile.vibe_tags, city, 5);
      } else {
        spots = await searchSpots(city, { min_rating: 4.0 });
      }
      console.log(`   📍 Found ${spots.length} spots`);
    } catch (spotError) {
      console.log('   ⚠️ Could not fetch spots:', spotError);
    }

    // Check if this is a new user (first message)
    const isNewUser = history.length <= 1;
    
    // Check for prediction market topics (sports teams, crypto, etc.)
    const predictionTopic = detectPredictionTopic(messageBody);
    let polymarketContext = null;
    
    if (predictionTopic) {
      console.log(`   📊 Prediction topic detected: "${predictionTopic}"`);
      try {
        polymarketContext = await getPolymarketContext(predictionTopic);
        console.log(`   📊 Found ${polymarketContext.markets.length} markets, trending: ${polymarketContext.trendingScore}`);
      } catch (err) {
        console.log('   ⚠️ Could not fetch Polymarket context:', err);
      }
    }
    
    // Generate response
    let response: string;
    if (isNewUser && !messageBody.toLowerCase().includes('recommend')) {
      response = generateWelcomeMessage(profile?.display_name || undefined);
    } else {
      response = await generateResponse(messageBody, history, profile, spots, polymarketContext);
    }

    // Save assistant response
    await addMessage(conversation.id, 'assistant', response, {
      intent,
      city,
      spots_count: spots.length,
      openai_used: isOpenAIConfigured(),
      prediction_topic: predictionTopic,
      polymarket_markets: polymarketContext?.markets.length || 0,
    });

    console.log(`   ✅ Response: "${response.substring(0, 50)}..."`);
    return response;

  } catch (error) {
    console.error('   ❌ Error processing message:', error);
    return "Oops! Something went wrong on my end. Try again in a bit! 🙏";
  }
}

/**
 * Handle incoming message - process and send response via REST API
 */
async function handleIncomingMessage(message: ParsedIncomingMessage): Promise<void> {
  const { from, body, messageId, chatId } = message;
  
  // Generate response
  const response = await generateMessageResponse(from, body, messageId);

  // Show typing indicator while "typing"
  if (chatId) {
    await startTypingIndicator(chatId);
  }

  // Small delay to simulate typing (optional, for UX)
  await new Promise(resolve => setTimeout(resolve, 500));

  // Stop typing indicator
  if (chatId) {
    await stopTypingIndicator(chatId);
  }

  // Send response via REST API
  console.log(`\n📤 Sending response to ${from} (chat: ${chatId})`);
  
  if (chatId) {
    // Use existing chat_id to reply
    const result = await sendMessageToChat(chatId, response);
    if (result.success) {
      console.log(`   ✅ Response sent via REST API to chat ${chatId}`);
    } else {
      console.error(`   ❌ Failed to send response: ${result.error}`);
      
      // Fallback: try creating a new chat
      console.log('   🔄 Trying fallback: create new chat...');
      const fallbackResult = await createChatAndSendMessage(
        kafkaConfig.senderNumber,
        from,
        response
      );
      if (fallbackResult.success) {
        console.log(`   ✅ Response sent via new chat ${fallbackResult.chatId}`);
      } else {
        console.error(`   ❌ Fallback also failed: ${fallbackResult.error}`);
      }
    }
  } else {
    // No chat_id, create new chat
    const result = await createChatAndSendMessage(
      kafkaConfig.senderNumber,
      from,
      response
    );
    if (result.success) {
      console.log(`   ✅ Response sent via new chat ${result.chatId}`);
    } else {
      console.error(`   ❌ Failed to send response: ${result.error}`);
    }
  }
}

/**
 * Main application startup
 */
async function main(): Promise<void> {
  console.log('🚀 Starting Social Oracle Backend...\n');

  // Log configuration status
  console.log('📋 Configuration:');
  console.log(`   Supabase: ${isSupabaseConfigured() ? '✅ Configured' : '⚠️ Not configured'}`);
  console.log(`   OpenAI: ${isOpenAIConfigured() ? '✅ Configured' : '⚠️ Not configured (using fallback)'}`);
  console.log(`   Series API: ${isSeriesApiConfigured() ? '✅ Configured' : '❌ NOT CONFIGURED - add SERIES_API_KEY to .env'}`);
  console.log('');

  if (!isSeriesApiConfigured()) {
    console.log('⚠️  WARNING: SERIES_API_KEY not set. Responses will NOT be sent!');
    console.log('   Add SERIES_API_KEY=your-api-key to your .env file\n');
  }

  // Set up message handler
  seriesConsumer.setMessageHandler(handleIncomingMessage);

  try {
    // Start the consumer (no need for producer since we use REST API)
    await seriesConsumer.start();

    // Start HTTP server
    const port = env.PORT ? parseInt(env.PORT, 10) : 3001;
    startServer(port);

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Social Oracle Backend is running!');
    console.log(`📞 Listening for SMS on: ${kafkaConfig.senderNumber}`);
    console.log(`📡 Kafka topic: ${kafkaConfig.topic}`);
    console.log(`🌐 Sending replies via: Series REST API`);
    console.log(`🚀 HTTP API server running on port ${port}`);
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
