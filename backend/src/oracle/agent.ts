/**
 * Oracle Agent
 * The main AI agent that processes messages and coordinates responses
 */

import { ParsedIncomingMessage } from '../kafka/types';
import { kafkaConfig } from '../config/kafka';
import { isSupabaseConfigured } from '../config/supabase';
import {
  getOrCreateUser,
  getOrCreateConversation,
  addMessage,
  updateConversationIntent,
  generateWelcomeMessage,
  formatSpotRecommendation,
  formatSpotList,
  isRateLimited,
  recordRequest,
  getRateLimitMessage,
} from '../services';
// Use robust API with retry logic
import {
  sendMessageToChat,
  createChatAndSendMessage,
  startTypingIndicator,
  stopTypingIndicator,
  isSeriesApiConfigured,
} from '../services/seriesApi-robust';
import {
  classifyIntent,
  IntentClassification,
  ExtendedIntent,
  isRecommendationIntent,
  isConversationalIntent,
} from './intentClassifier';
import {
  buildContext,
  buildMinimalContext,
  OracleContext,
  getContextSummary,
} from './contextBuilder';
import {
  generateResponse,
  generateGreeting,
  generateVibeCheck,
  generateRecommendation,
  generateMeetupResponse,
  generateReflection,
  generateFallbackResponse,
  isOpenAIConfigured,
  intentToResponseType,
  OracleGeneratedResponse,
  ResponseType,
} from './responseGenerator';
import { UserIntent } from '../types/database';

/**
 * Oracle Agent response
 */
export interface OracleResponse {
  text: string;
  intent: ExtendedIntent;
  context?: OracleContext;
  metadata?: {
    suggestedActions?: Array<{ label: string; action: string }>;
    fallback?: boolean;
    model?: string;
    tokensUsed?: number;
    polymarketUsed?: boolean;
    redditGemsFound?: number;
    spotsFound?: number;
    spotsAvailable?: number;
    sentiment?: 'positive' | 'negative' | 'neutral';
    [key: string]: unknown;
  };
}

/**
 * Oracle Agent configuration
 */
export interface OracleAgentConfig {
  enablePolymarket?: boolean;
  enableReddit?: boolean;
  enableTypingIndicator?: boolean;
  maxResponseLength?: number;
  debugMode?: boolean;
}

const DEFAULT_CONFIG: OracleAgentConfig = {
  enablePolymarket: true,
  enableReddit: true,
  enableTypingIndicator: true,
  maxResponseLength: 320,
  debugMode: false,
};

/**
 * The Oracle Agent class
 * Handles incoming messages, builds context, and generates responses
 */
export class OracleAgent {
  private config: OracleAgentConfig;

  constructor(config: OracleAgentConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    console.log('🔮 Oracle Agent initialized');
    console.log(`   Polymarket: ${this.config.enablePolymarket ? '✅' : '❌'}`);
    console.log(`   Reddit: ${this.config.enableReddit ? '✅' : '❌'}`);
    console.log(`   OpenAI: ${isOpenAIConfigured() ? '✅' : '⚠️ fallback mode'}`);
    console.log(`   Supabase: ${isSupabaseConfigured() ? '✅' : '⚠️ limited mode'}`);
  }

  /**
   * Main entry point - handle an incoming message
   */
  async handleIncomingMessage(message: ParsedIncomingMessage): Promise<void> {
    const { from: phoneNumber, body, messageId, chatId } = message;
    
    console.log(`\n🔮 ═══════════════════════════════════════════`);
    console.log(`📱 Oracle processing message from ${phoneNumber}`);
    console.log(`   "${body}"`);

    try {
      // Generate response
      const response = await this.processMessage(phoneNumber, body, messageId);

      // Show typing indicator
      if (this.config.enableTypingIndicator && chatId) {
        await startTypingIndicator(chatId).catch(() => {});
      }

      // Small delay to simulate typing
      await this.simulateTyping(response.text.length);

      // Stop typing indicator
      if (this.config.enableTypingIndicator && chatId) {
        await stopTypingIndicator(chatId).catch(() => {});
      }

      // Send response
      await this.sendResponse(phoneNumber, response.text, chatId);

      console.log(`✅ Response sent: "${response.text.substring(0, 50)}..."`);
      console.log(`🔮 ═══════════════════════════════════════════\n`);

    } catch (error) {
      console.error('❌ Oracle error:', error);
      
      // Try to send error response
      const errorMessage = "Oops! Something went wrong on my end. Try again in a bit! 🙏";
      await this.sendResponse(phoneNumber, errorMessage, chatId).catch(() => {});
    }
  }

  /**
   * Process a message and generate a response
   */
  async processMessage(
    phoneNumber: string,
    messageBody: string,
    messageId: string
  ): Promise<OracleResponse> {
    // Check rate limit
    if (isRateLimited(phoneNumber)) {
      console.log('   ⚠️ Rate limited');
      return {
        text: getRateLimitMessage(),
        intent: 'general',
      };
    }
    recordRequest(phoneNumber);

    // Classify intent
    const intentClassification = classifyIntent(messageBody);
    console.log(`   🎯 Intent: ${intentClassification.intent} (${Math.round(intentClassification.confidence * 100)}%)`);

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.log('   ⚠️ Supabase not configured, using basic response');
      return this.handleWithoutDatabase(messageBody, intentClassification);
    }

    // Get or create user
    const user = await getOrCreateUser(phoneNumber);
    console.log(`   👤 User: ${user.id}`);

    // Get or create conversation
    const conversation = await getOrCreateConversation(user.id, messageId);
    console.log(`   💬 Conversation: ${conversation.id}`);

    // Save incoming message
    await addMessage(conversation.id, 'user', messageBody);

    // Update conversation intent
    await updateConversationIntent(conversation.id, intentClassification.dbIntent);

    // Build context based on intent
    const context = await this.buildContextForIntent(
      user.id,
      phoneNumber,
      conversation.id,
      messageBody,
      intentClassification
    );

    if (this.config.debugMode) {
      console.log(`   📦 Context: ${getContextSummary(context)}`);
    }

    // Route to appropriate handler
    const response = await this.routeToHandler(context);

    // Save assistant response
    await addMessage(conversation.id, 'assistant', response.text, {
      intent: response.intent,
      confidence: intentClassification.confidence,
      polymarket_data: !!context.polymarket,
      reddit_data: !!context.reddit,
      spots_count: context.relevantSpots?.length || 0,
    });

    return {
      ...response,
      context,
    };
  }

  /**
   * Build context based on intent type
   */
  private async buildContextForIntent(
    userId: string,
    phoneNumber: string,
    conversationId: string,
    message: string,
    intentClassification: IntentClassification
  ): Promise<OracleContext> {
    // For conversational intents, use minimal context
    if (isConversationalIntent(intentClassification.intent)) {
      return buildMinimalContext(
        userId,
        phoneNumber,
        conversationId,
        message,
        intentClassification
      );
    }

    // For recommendation intents, fetch full context
    return buildContext(
      userId,
      phoneNumber,
      conversationId,
      message,
      intentClassification,
      {
        fetchPolymarket: this.config.enablePolymarket,
        fetchReddit: this.config.enableReddit,
        fetchSpots: isRecommendationIntent(intentClassification.intent),
        fetchCityVibe: true,
      }
    );
  }

  /**
   * Route to appropriate handler based on intent
   */
  private async routeToHandler(context: OracleContext): Promise<OracleResponse> {
    const { intent } = context.intentClassification;

    switch (intent) {
      case 'greeting':
        return this.handleGreeting(context);
      
      case 'help':
        return this.handleHelp(context);
      
      case 'vibe_check':
        return this.handleVibeCheck(context);
      
      case 'meet':
        return this.handleMeetupRequest(context);
      
      case 'reflection':
        return this.handleReflection(context);
      
      case 'drink':
      case 'explore':
      case 'learn':
      case 'recommendation':
        return this.handleRecommendation(context);
      
      default:
        return this.handleGeneral(context);
    }
  }

  /**
   * Handle greeting messages
   */
  private async handleGreeting(context: OracleContext): Promise<OracleResponse> {
    const name = context.profile?.display_name || undefined;
    const isReturning = context.conversationHistory.length > 2;

    const generated = await generateGreeting(name, isReturning, context);

    return {
      text: generated.message,
      intent: 'greeting',
      metadata: {
        suggestedActions: generated.suggestedActions,
        fallback: generated.fallback,
      },
    };
  }

  /**
   * Handle help requests
   */
  private async handleHelp(context: OracleContext): Promise<OracleResponse> {
    // Help is static - no LLM needed
    return {
      text: `I can help you with:
🍻 Find bars & drinks
🍕 Restaurant recommendations  
👥 Meet new people
📊 Sports predictions (Polymarket)
🎯 Discover hidden gems

Just tell me what you're looking for!`,
      intent: 'help',
    };
  }

  /**
   * Handle vibe check requests
   */
  private async handleVibeCheck(context: OracleContext): Promise<OracleResponse> {
    const generated = await generateVibeCheck(context);

    return {
      text: generated.message,
      intent: 'vibe_check',
      metadata: {
        suggestedActions: generated.suggestedActions,
        fallback: generated.fallback,
        polymarketUsed: !!context.polymarket,
      },
    };
  }

  /**
   * Handle meetup requests
   */
  private async handleMeetupRequest(context: OracleContext): Promise<OracleResponse> {
    const generated = await generateMeetupResponse(context);

    return {
      text: generated.message,
      intent: 'meet',
      metadata: {
        suggestedActions: generated.suggestedActions,
        fallback: generated.fallback,
        spotsAvailable: context.relevantSpots?.length || 0,
      },
    };
  }

  /**
   * Handle reflection/review requests
   */
  private async handleReflection(context: OracleContext): Promise<OracleResponse> {
    // Detect sentiment from message
    const messageLower = context.originalMessage.toLowerCase();
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    
    if (messageLower.match(/love|great|amazing|awesome|fantastic|incredible/)) {
      sentiment = 'positive';
    } else if (messageLower.match(/terrible|bad|sucked|awful|mid|disappointing/)) {
      sentiment = 'negative';
    }

    const generated = await generateReflection(context, sentiment);

    return {
      text: generated.message,
      intent: 'reflection',
      metadata: {
        sentiment,
        suggestedActions: generated.suggestedActions,
        fallback: generated.fallback,
      },
    };
  }

  /**
   * Handle recommendation requests
   */
  private async handleRecommendation(context: OracleContext): Promise<OracleResponse> {
    const { intent } = context.intentClassification;

    // Use the LLM-powered recommendation generator
    const generated = await generateRecommendation(context);

    return {
      text: generated.message,
      intent,
      metadata: {
        suggestedActions: generated.suggestedActions,
        fallback: generated.fallback,
        spotsFound: context.relevantSpots?.length || 0,
        redditGemsFound: context.reddit?.hiddenGems?.length || 0,
      },
    };
  }

  /**
   * Handle general/catch-all messages
   */
  private async handleGeneral(context: OracleContext): Promise<OracleResponse> {
    const generated = await generateResponse({
      userMessage: context.originalMessage,
      intent: context.intentClassification.intent,
      context,
      responseType: 'general',
    });

    return {
      text: generated.message,
      intent: 'general',
      metadata: {
        suggestedActions: generated.suggestedActions,
        fallback: generated.fallback,
        model: generated.model,
        tokensUsed: generated.tokensUsed,
      },
    };
  }

  /**
   * Handle messages when database is not available
   */
  private async handleWithoutDatabase(
    message: string,
    intentClassification: IntentClassification
  ): Promise<OracleResponse> {
    // Build a minimal context for fallback response
    const minimalContext: OracleContext = {
      user: { id: 'anonymous', phoneNumber: 'unknown' },
      profile: null,
      conversationId: 'temp',
      conversationHistory: [],
      intentClassification,
      dbIntent: intentClassification.dbIntent,
      entities: { city: 'new york' },
      originalMessage: message,
      timestamp: new Date(),
    };

    const responseType = intentToResponseType(intentClassification.intent);

    // Try LLM if available, otherwise use fallback
    if (isOpenAIConfigured()) {
      const generated = await generateResponse({
        userMessage: message,
        intent: intentClassification.intent,
        context: minimalContext,
        responseType,
      });
      return {
        text: generated.message,
        intent: intentClassification.intent,
        metadata: {
          suggestedActions: generated.suggestedActions,
          fallback: generated.fallback,
        },
      };
    }

    // Pure fallback mode
    const generated = generateFallbackResponse(
      message,
      intentClassification.intent,
      minimalContext,
      responseType
    );
    
    return {
      text: generated.message,
      intent: intentClassification.intent,
      metadata: {
        suggestedActions: generated.suggestedActions,
        fallback: true,
      },
    };
  }

  /**
   * Send response via Series API
   */
  private async sendResponse(
    phoneNumber: string,
    text: string,
    chatId?: string
  ): Promise<void> {
    // Truncate if needed
    let responseText = text;
    if (responseText.length > (this.config.maxResponseLength || 320)) {
      responseText = responseText.substring(0, (this.config.maxResponseLength || 320) - 3) + '...';
    }

    console.log(`\n📤 Sending response to ${phoneNumber}`);
    
    if (!isSeriesApiConfigured()) {
      console.log('   ⚠️ Series API not configured - response not sent');
      console.log(`   Would have sent: "${responseText}"`);
      return;
    }

    if (chatId) {
      // Reply to existing chat
      const result = await sendMessageToChat(chatId, responseText);
      if (result.success) {
        console.log(`   ✅ Sent to chat ${chatId}`);
      } else {
        console.error(`   ❌ Failed: ${result.error}`);
        // Try fallback
        const fallback = await createChatAndSendMessage(
          kafkaConfig.senderNumber,
          phoneNumber,
          responseText
        );
        if (fallback.success) {
          console.log(`   ✅ Sent via new chat ${fallback.chatId}`);
        }
      }
    } else {
      // Create new chat
      const result = await createChatAndSendMessage(
        kafkaConfig.senderNumber,
        phoneNumber,
        responseText
      );
      if (result.success) {
        console.log(`   ✅ Sent via new chat ${result.chatId}`);
      } else {
        console.error(`   ❌ Failed: ${result.error}`);
      }
    }
  }

  /**
   * Simulate typing delay based on message length
   */
  private async simulateTyping(messageLength: number): Promise<void> {
    // Roughly 50ms per character, max 2 seconds
    const delay = Math.min(messageLength * 20, 2000);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

/**
 * Create and export a default Oracle Agent instance
 */
export function createOracleAgent(config?: OracleAgentConfig): OracleAgent {
  return new OracleAgent(config);
}
