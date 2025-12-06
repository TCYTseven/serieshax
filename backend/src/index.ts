import { seriesConsumer } from './kafka/consumer';
import { kafkaConfig } from './config/kafka';
import { isSupabaseConfigured } from './config/supabase';
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
  replyToReflection,
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
  console.log(`   Message: "${messageBody}"`);
  console.log(`   Message ID: ${messageId}`);

  // Check rate limit
  if (isRateLimited(phoneNumber)) {
    console.log('   ⚠️ Rate limited - returning rate limit message');
    return getRateLimitMessage();
  }
  console.log('   ✅ Rate limit check passed');
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
    if (error instanceof Error) {
      console.error(`      Error message: ${error.message}`);
      console.error(`      Error stack: ${error.stack}`);
    }
    return "Oops! Something went wrong on my end. Try again in a bit! 🙏";
  }
}

// Track sent messages to prevent duplicates
const sentMessagesCache = new Set<string>();
const MAX_SENT_CACHE_SIZE = 1000;

/**
 * Handle a reflection message - process reflection and send follow-up questions
 * This can be triggered when a user sends a reflection (e.g., after a meetup)
 */
async function handleReflectionMessage(
  phoneNumber: string,
  reflectionText: string,
  chatId?: string,
  messageId?: string,
  kafkaKey?: string
): Promise<void> {
  console.log(`\n💭 Processing reflection from ${phoneNumber}`);
  
  // Use Kafka key for deduplication (most reliable)
  const messageKey = `reflection-${kafkaKey || `${phoneNumber}-${messageId || Date.now()}`}`;
  
  // Check if we've already sent a response for this message
  if (sentMessagesCache.has(messageKey)) {
    console.log(`   ⚠️ DUPLICATE REFLECTION: Already processed Kafka message ${kafkaKey}, skipping send...`);
    return;
  }
  
  try {
    // Get or create user
    const user = await getOrCreateUser(phoneNumber);
    
    // Process the reflection (saves raw reflection, generates follow-ups and analysis)
    const result = await replyToReflection({
      user_id: user.id,
      raw_reflection: reflectionText,
    });
    
    // Format follow-up message (should be a single encouraging message)
    const followUpText = result.followUpQuestions[0] || "That sounds great! Tell me how your night went, and I'll be sure to listen and help you reflect.";
    
    // Send follow-up message via SMS (ONLY ONCE)
    // CRITICAL: We MUST send a response - retry until successful
    console.log(`\n📤 Sending reflection invitation to ${phoneNumber}`);
    console.log(`   Message: "${followUpText}"`);
    console.log(`   Message Key: ${messageKey}`);
    
    let sendSuccess = false;
    const maxRetries = 3;
    let attempts = 0;
    
    while (!sendSuccess && attempts < maxRetries) {
      attempts++;
      console.log(`   → Attempt ${attempts}/${maxRetries} to send reflection invitation...`);
      
      if (chatId) {
        const sendResult = await sendMessageToChat(chatId, followUpText);
        sendSuccess = sendResult.success;
        if (sendSuccess) {
          console.log(`   ✅ Reflection invitation sent to chat ${chatId}`);
          // Mark as sent ONLY after successful send
          sentMessagesCache.add(messageKey);
          if (sentMessagesCache.size > MAX_SENT_CACHE_SIZE) {
            const firstKey = sentMessagesCache.values().next().value;
            if (firstKey) {
              sentMessagesCache.delete(firstKey);
            }
          }
          break;
        } else {
          console.error(`   ❌ Attempt ${attempts} failed: ${sendResult.error}`);
          if (attempts < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          }
        }
      } else {
        const sendResult = await createChatAndSendMessage(
          kafkaConfig.senderNumber,
          phoneNumber,
          followUpText
        );
        sendSuccess = sendResult.success;
        if (sendSuccess) {
          console.log(`   ✅ Reflection invitation sent via new chat ${sendResult.chatId}`);
          // Mark as sent ONLY after successful send
          sentMessagesCache.add(messageKey);
          if (sentMessagesCache.size > MAX_SENT_CACHE_SIZE) {
            const firstKey = sentMessagesCache.values().next().value;
            if (firstKey) {
              sentMessagesCache.delete(firstKey);
            }
          }
          break;
        } else {
          console.error(`   ❌ Attempt ${attempts} failed: ${sendResult.error}`);
          if (attempts < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          }
        }
      }
    }
    
    if (sendSuccess) {
      console.log(`   📊 Analysis generated and saved (Reflection ID: ${result.reflection.id})`);
    } else {
      console.error(`   ⚠️ CRITICAL: All ${maxRetries} attempts failed for reflection invitation`);
      // Don't mark as sent so it can retry
    }
    
  } catch (error) {
    console.error('   ❌ Error processing reflection:', error);
    // Remove from cache on error so it can be retried
    sentMessagesCache.delete(messageKey);
    // DON'T send error message - it could cause duplicate sends
  }
}

/**
 * Detect if a message is a reflection
 * Activates when message contains "to reflect" (e.g., "I'm ready to reflect about basketball hangout today" 
 * or "I want to reflect about my night")
 */
function isReflectionMessage(messageBody: string): boolean {
  const lower = messageBody.toLowerCase().trim();
  
  // Check if message contains "to reflect" anywhere in the text
  // Examples that will match:
  // - "I'm ready to reflect about basketball hangout today"
  // - "I want to reflect about my night"
  // - "to reflect on today's meetup"
  // - "ready to reflect"
  const containsToReflect = /\bto\s+reflect\b/i.test(lower);
  
  return containsToReflect;
}

/**
 * Handle incoming message - process and send response via REST API
 */
async function handleIncomingMessage(message: ParsedIncomingMessage): Promise<void> {
  const { from, body, messageId, chatId, kafkaPartition, kafkaOffset } = message;
  
  console.log('\n🔵 ═══════════════════════════════════════════');
  console.log(`📥 HANDLING INCOMING MESSAGE`);
  console.log(`   From: ${from}`);
  console.log(`   Body: "${body}"`);
  console.log(`   Message ID: ${messageId}`);
  console.log(`   Chat ID: ${chatId || 'none'}`);
  console.log(`   Kafka: Partition ${kafkaPartition ?? 'unknown'}, Offset ${kafkaOffset ?? 'unknown'}`);
  
  // CRITICAL: Use Kafka partition-offset for deduplication (guaranteed unique)
  // Fallback to messageId if Kafka metadata is missing (shouldn't happen, but safety check)
  const kafkaKey = (kafkaPartition !== undefined && kafkaOffset !== undefined) 
    ? `${kafkaPartition}-${kafkaOffset}` 
    : `fallback-${messageId || Date.now()}`;
  
  try {
    // Check if this is a reflection message
    const isReflection = isReflectionMessage(body);
    console.log(`   Is reflection: ${isReflection}`);
    
    if (isReflection) {
      console.log('   → Processing as reflection...');
      // Check if we've already processed this Kafka message
      if (sentMessagesCache.has(`reflection-${kafkaKey}`)) {
        console.log(`   ⚠️ DUPLICATE: Already processed Kafka message ${kafkaKey}, skipping...`);
        return;
      }
      await handleReflectionMessage(from, body, chatId, messageId, kafkaKey);
      console.log('   ✅ Reflection processing complete');
      return;
    }
    
    console.log('   → Processing as regular message...');
    
    // Check if we've already sent a response for this Kafka message
    const messageKey = `regular-${kafkaKey}`;
    if (sentMessagesCache.has(messageKey)) {
      console.log(`   ⚠️ DUPLICATE: Already processed Kafka message ${kafkaKey}, skipping send...`);
      return;
    }
    
    // Generate response - ALWAYS generate something, even on error
    let response: string;
    try {
      response = await generateMessageResponse(from, body, messageId);
      console.log(`   ✅ Generated response: "${response.substring(0, 50)}..."`);
    } catch (error) {
      console.error('   ❌ Error generating response:', error);
      if (error instanceof Error) {
        console.error(`      Error details: ${error.message}`);
      }
      // ALWAYS have a fallback response
      response = "Hey! I'm here but having a bit of trouble processing that. Can you try again?";
      console.log(`   ✅ Using fallback response: "${response}"`);
    }

    // Show typing indicator while "typing"
    console.log('   → Starting typing indicator...');
    if (chatId) {
      try {
        await startTypingIndicator(chatId);
        console.log('   ✅ Typing indicator started');
      } catch (error) {
        console.log('   ⚠️ Could not start typing indicator:', error);
      }
    } else {
      console.log('   ⚠️ No chatId, skipping typing indicator');
    }

    // Small delay to simulate typing (optional, for UX)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Stop typing indicator
    if (chatId) {
      try {
        await stopTypingIndicator(chatId);
        console.log('   ✅ Typing indicator stopped');
      } catch (error) {
        console.log('   ⚠️ Could not stop typing indicator:', error);
      }
    }

    // Send response via REST API (ALWAYS send, even if there were errors)
    console.log(`\n📤 Sending response to ${from} (chat: ${chatId || 'new chat'})`);
    console.log(`   Message Key: ${messageKey}`);
    
    // Send response - mark as sent ONLY after successful send
    // CRITICAL: We MUST send a response - retry until successful
    let sendSuccess = false;
    const maxRetries = 3;
    let attempts = 0;
    
    while (!sendSuccess && attempts < maxRetries) {
      attempts++;
      console.log(`   → Attempt ${attempts}/${maxRetries} to send response...`);
      
      if (chatId) {
        // Use existing chat_id to reply
        console.log(`   → Sending to existing chat ${chatId}...`);
        try {
          const result = await sendMessageToChat(chatId, response);
          sendSuccess = result.success;
          if (sendSuccess) {
            console.log(`   ✅ Response sent via REST API to chat ${chatId}`);
            console.log(`   📨 Message ID: ${result.messageId || 'unknown'}`);
            // Mark as sent ONLY after successful send
            sentMessagesCache.add(messageKey);
            if (sentMessagesCache.size > MAX_SENT_CACHE_SIZE) {
              const firstKey = sentMessagesCache.values().next().value;
              if (firstKey) {
                sentMessagesCache.delete(firstKey);
              }
            }
            break; // Success, exit retry loop
          } else {
            console.error(`   ❌ Attempt ${attempts} failed: ${result.error}`);
            if (attempts < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
            }
          }
        } catch (error) {
          console.error(`   ❌ Exception on attempt ${attempts}:`, error);
          if (attempts < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          }
        }
      }
      
      // Fallback: try creating a new chat if existing chat failed
      if (!sendSuccess && attempts < maxRetries) {
        console.log('   🔄 Trying fallback: create new chat...');
        try {
          const fallbackResult = await createChatAndSendMessage(
            kafkaConfig.senderNumber,
            from,
            response
          );
          sendSuccess = fallbackResult.success;
          if (sendSuccess) {
            console.log(`   ✅ Response sent via new chat ${fallbackResult.chatId}`);
            // Mark as sent ONLY after successful send
            sentMessagesCache.add(messageKey);
            if (sentMessagesCache.size > MAX_SENT_CACHE_SIZE) {
              const firstKey = sentMessagesCache.values().next().value;
              if (firstKey) {
                sentMessagesCache.delete(firstKey);
              }
            }
            break; // Success, exit retry loop
          } else {
            console.error(`   ❌ Fallback attempt ${attempts} failed: ${fallbackResult.error}`);
            if (attempts < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
          }
        } catch (error) {
          console.error(`   ❌ Exception in fallback attempt ${attempts}:`, error);
          if (attempts < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          }
        }
      }
    }
    
    // If all retries failed, we MUST still send something
    if (!sendSuccess) {
      console.error(`   ⚠️ CRITICAL: All ${maxRetries} attempts failed! Trying emergency send...`);
      // Emergency fallback - try one more time with a simpler message
      try {
        const emergencyResponse = "Hey! Got your message. Let me get back to you in a sec!";
        const emergencyResult = chatId 
          ? await sendMessageToChat(chatId, emergencyResponse)
          : await createChatAndSendMessage(kafkaConfig.senderNumber, from, emergencyResponse);
        
        if (emergencyResult.success) {
          console.log(`   ✅ Emergency response sent`);
          sentMessagesCache.add(messageKey);
        } else {
          console.error(`   ❌ EMERGENCY SEND ALSO FAILED - USER WILL NOT RECEIVE RESPONSE`);
          // Don't mark as sent so it can retry on next Kafka delivery
        }
      } catch (emergencyError) {
        console.error(`   ❌ EMERGENCY SEND EXCEPTION:`, emergencyError);
        // Don't mark as sent - let Kafka redeliver
      }
    }
    
    console.log('═══════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ ═══════════════════════════════════════════');
    console.error('❌ ERROR IN handleIncomingMessage:');
    console.error(`   From: ${from}`);
    console.error(`   Body: "${body}"`);
    console.error(`   Message ID: ${messageId}`);
    console.error(`   Error:`, error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }
    console.error('═══════════════════════════════════════════\n');
    
    // CRITICAL: Always send SOMETHING to the user, even on error
    // Use Kafka key for deduplication
    const errorMessageKey = `error-${kafkaKey}`;
    if (!sentMessagesCache.has(errorMessageKey)) {
      try {
        const errorResponse = "Hey! I'm here but ran into a small issue. Can you try sending that again?";
        let errorSendSuccess = false;
        
        if (chatId) {
          const result = await sendMessageToChat(chatId, errorResponse);
          errorSendSuccess = result.success;
        } else {
          const result = await createChatAndSendMessage(
            kafkaConfig.senderNumber,
            from,
            errorResponse
          );
          errorSendSuccess = result.success;
        }
        
        if (errorSendSuccess) {
          sentMessagesCache.add(errorMessageKey);
          console.log(`   ✅ Sent error recovery message to user`);
        } else {
          console.error('   ⚠️ Failed to send error recovery message');
        }
      } catch (sendError) {
        console.error('   ⚠️ Exception sending error recovery message:', sendError);
      }
    }
    
    // Don't rethrow - let Kafka commit the offset and continue
    // The error has been logged and we've attempted to notify user
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

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Social Oracle Backend is running!');
    console.log(`📞 Listening for SMS on: ${kafkaConfig.senderNumber}`);
    console.log(`📡 Kafka topic: ${kafkaConfig.topic}`);
    console.log(`🌐 Sending replies via: Series REST API`);
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
