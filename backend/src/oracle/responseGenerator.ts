/**
 * Response Generator
 * LLM-powered response generation for the Social Oracle
 */

import OpenAI from 'openai';
import { env } from '../config/env';
import { OracleContext } from './contextBuilder';
import { ExtendedIntent } from './intentClassifier';
import { UserIntent } from '../types/database';
import {
  buildFullPrompt,
  buildErrorRecoveryPrompt,
  getSuggestedActions,
  SuggestedAction,
  ORACLE_PERSONALITY,
  buildUserContextPrompt,
  buildSpotsContextPrompt,
  buildPolymarketContextPrompt,
} from './prompts';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Response types map to different Oracle behaviors
 */
export type ResponseType = 
  | 'vibe_check'
  | 'icebreaker'
  | 'recommendation'
  | 'meetup'
  | 'reflection'
  | 'general';

/**
 * Options for generating a response
 */
export interface GenerateResponseOptions {
  userMessage: string;
  intent: ExtendedIntent;
  context: OracleContext;
  responseType: ResponseType;
  maxTokens?: number;
  temperature?: number;
}

/**
 * The Oracle's response
 */
export interface OracleGeneratedResponse {
  message: string;
  suggestedActions?: SuggestedAction[];
  internalNotes?: string;
  model?: string;
  tokensUsed?: number;
  fallback?: boolean;
}

/**
 * Generation statistics for debugging
 */
export interface GenerationStats {
  promptLength: number;
  responseLength: number;
  tokensUsed: number;
  latencyMs: number;
  model: string;
  fallback: boolean;
}

// ============================================================================
// OPENAI CLIENT
// ============================================================================

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!env.OPENAI_API_KEY;
}

// ============================================================================
// INTENT TO RESPONSE TYPE MAPPING
// ============================================================================

/**
 * Map intent to the appropriate response type
 */
export function intentToResponseType(intent: ExtendedIntent): ResponseType {
  switch (intent) {
    case 'vibe_check':
      return 'vibe_check';
    
    case 'meet':
      return 'meetup';
    
    case 'reflection':
      return 'reflection';
    
    case 'drink':
    case 'explore':
    case 'learn':
    case 'recommendation':
      return 'recommendation';
    
    case 'greeting':
    case 'help':
    case 'general':
    default:
      return 'general';
  }
}

// ============================================================================
// MAIN RESPONSE GENERATOR
// ============================================================================

/**
 * Generate a response using the LLM
 */
export async function generateResponse(
  options: GenerateResponseOptions
): Promise<OracleGeneratedResponse> {
  const {
    userMessage,
    intent,
    context,
    responseType,
    maxTokens = 150,
    temperature = 0.8,
  } = options;

  const startTime = Date.now();

  // Check if OpenAI is available
  if (!isOpenAIConfigured()) {
    console.log('   ⚠️ OpenAI not configured, using fallback');
    return generateFallbackResponse(userMessage, intent, context, responseType);
  }

  try {
    // Build the full prompt
    const systemPrompt = buildFullPrompt({
      responseType,
      userMessage,
      context,
    });

    // Build messages array
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add recent conversation history as assistant/user pairs
    const recentHistory = context.conversationHistory.slice(-6);
    for (const msg of recentHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    // Call OpenAI
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: maxTokens,
      temperature,
      presence_penalty: 0.3,  // Encourage variety
      frequency_penalty: 0.3, // Reduce repetition
    });

    const response = completion.choices[0]?.message?.content;
    const tokensUsed = completion.usage?.total_tokens || 0;
    const latency = Date.now() - startTime;

    if (!response) {
      console.log('   ⚠️ Empty response from OpenAI, using fallback');
      return generateFallbackResponse(userMessage, intent, context, responseType);
    }

    // Ensure response isn't too long for SMS
    let finalMessage = response.trim();
    if (finalMessage.length > 280) {
      finalMessage = truncateSmartly(finalMessage, 280);
    }

    console.log(`   🤖 Generated response (${latency}ms, ${tokensUsed} tokens)`);

    return {
      message: finalMessage,
      suggestedActions: getSuggestedActions(responseType, context),
      internalNotes: `Intent: ${intent}, Type: ${responseType}, Latency: ${latency}ms`,
      model: 'gpt-4o-mini',
      tokensUsed,
      fallback: false,
    };

  } catch (error: any) {
    console.error('   ❌ OpenAI error:', error.message);
    
    // Handle specific error types
    if (error.status === 429) {
      return {
        message: buildErrorRecoveryPrompt('rate_limit'),
        internalNotes: 'OpenAI rate limit hit',
        fallback: true,
      };
    }

    return generateFallbackResponse(userMessage, intent, context, responseType);
  }
}

// ============================================================================
// SPECIALIZED GENERATORS
// ============================================================================

/**
 * Generate a greeting response
 */
export async function generateGreeting(
  userName: string | undefined,
  isReturningUser: boolean,
  context: OracleContext
): Promise<OracleGeneratedResponse> {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';

  // Quick greetings don't need full LLM call
  if (!isOpenAIConfigured()) {
    if (isReturningUser && userName) {
      return {
        message: `Hey ${userName}! 👋 Good to see you back. What are you in the mood for today?`,
        suggestedActions: getSuggestedActions('general', context),
        fallback: true,
      };
    }
    return {
      message: `Hey! 👋 I'm the Social Oracle - your guide to the city's hidden gems. What vibe are you chasing?`,
      suggestedActions: getSuggestedActions('general', context),
      fallback: true,
    };
  }

  return generateResponse({
    userMessage: context.originalMessage,
    intent: 'greeting',
    context,
    responseType: 'general',
    temperature: 0.9, // More creative for greetings
  });
}

/**
 * Generate a vibe check response with prediction data
 */
export async function generateVibeCheck(
  context: OracleContext
): Promise<OracleGeneratedResponse> {
  // If we have Polymarket data, enrich the context
  if (context.polymarket?.sportsPrediction) {
    const sp = context.polymarket.sportsPrediction;
    const fallbackMessage = `📊 ${sp.favored} is favored at ${Math.round(sp.probability * 100)}% over ${sp.underdog}. What's your take?`;
    
    if (!isOpenAIConfigured()) {
      return {
        message: fallbackMessage,
        suggestedActions: getSuggestedActions('vibe_check', context),
        fallback: true,
      };
    }
  }

  return generateResponse({
    userMessage: context.originalMessage,
    intent: 'vibe_check',
    context,
    responseType: 'vibe_check',
  });
}

/**
 * Generate an icebreaker using available data
 */
export async function generateIcebreaker(
  context: OracleContext,
  topic?: string
): Promise<OracleGeneratedResponse> {
  // Use Polymarket suggested icebreaker if available
  if (context.polymarket?.suggestedIcebreaker && !isOpenAIConfigured()) {
    return {
      message: context.polymarket.suggestedIcebreaker,
      suggestedActions: getSuggestedActions('icebreaker', context),
      fallback: true,
    };
  }

  return generateResponse({
    userMessage: topic || context.originalMessage,
    intent: 'vibe_check',
    context,
    responseType: 'icebreaker',
    temperature: 0.9, // More creative for icebreakers
  });
}

/**
 * Generate a spot recommendation
 */
export async function generateRecommendation(
  context: OracleContext
): Promise<OracleGeneratedResponse> {
  // Ensure we have spots to recommend
  if (!context.relevantSpots || context.relevantSpots.length === 0) {
    return {
      message: buildErrorRecoveryPrompt('no_spots_found'),
      suggestedActions: getSuggestedActions('general', context),
      fallback: true,
    };
  }

  return generateResponse({
    userMessage: context.originalMessage,
    intent: context.intentClassification.intent,
    context,
    responseType: 'recommendation',
  });
}

/**
 * Generate a meetup facilitation response
 */
export async function generateMeetupResponse(
  context: OracleContext
): Promise<OracleGeneratedResponse> {
  return generateResponse({
    userMessage: context.originalMessage,
    intent: 'meet',
    context,
    responseType: 'meetup',
    temperature: 0.7, // Slightly less creative for meetups (more reliable)
  });
}

/**
 * Generate a reflection/review handling response
 */
export async function generateReflection(
  context: OracleContext,
  sentiment: 'positive' | 'negative' | 'neutral'
): Promise<OracleGeneratedResponse> {
  // Add sentiment hint to context
  const enhancedContext = {
    ...context,
    entities: {
      ...context.entities,
      vibes: [...(context.entities.vibes || []), `user_sentiment:${sentiment}`],
    },
  };

  return generateResponse({
    userMessage: context.originalMessage,
    intent: 'reflection',
    context: enhancedContext,
    responseType: 'reflection',
  });
}

// ============================================================================
// FALLBACK RESPONSE GENERATOR
// ============================================================================

/**
 * Generate a response without LLM (fallback mode)
 */
export function generateFallbackResponse(
  userMessage: string,
  intent: ExtendedIntent,
  context: OracleContext,
  responseType: ResponseType
): OracleGeneratedResponse {
  const messageLower = userMessage.toLowerCase();

  // Greeting fallback
  if (intent === 'greeting' || messageLower.match(/^(hi|hello|hey|sup|yo)\b/)) {
    const name = context.profile?.display_name;
    return {
      message: name 
        ? `Hey ${name}! 👋 What are you in the mood for today?`
        : `Hey! 👋 I'm the Social Oracle. What kind of vibe are you chasing?`,
      suggestedActions: getSuggestedActions('general', context),
      fallback: true,
    };
  }

  // Help fallback
  if (intent === 'help') {
    return {
      message: `I can help you find:\n🍻 Great bars\n🍕 Food spots\n👥 People to meet\n📊 Hot predictions\n\nWhat sounds good?`,
      suggestedActions: getSuggestedActions('general', context),
      fallback: true,
    };
  }

  // Vibe check with Polymarket data
  if (responseType === 'vibe_check' && context.polymarket?.sportsPrediction) {
    const sp = context.polymarket.sportsPrediction;
    return {
      message: `📊 ${sp.favored} is favored at ${Math.round(sp.probability * 100)}% over ${sp.underdog}. What's your take?`,
      suggestedActions: getSuggestedActions('vibe_check', context),
      fallback: true,
    };
  }

  // Recommendation with spots
  if (responseType === 'recommendation' && context.relevantSpots?.length) {
    const spot = context.relevantSpots[0];
    const vibeText = spot.vibe_descriptors?.[0] || 'great';
    return {
      message: `Check out ${spot.name}! It's got ${vibeText} vibes and fits your style. ${spot.description ? spot.description.substring(0, 80) : ''}`,
      suggestedActions: getSuggestedActions('recommendation', context),
      fallback: true,
    };
  }

  // Meetup fallback
  if (responseType === 'meetup') {
    const city = context.entities.city || 'your area';
    return {
      message: `Looking to meet people in ${city}! What kind of crowd are you hoping to connect with?`,
      suggestedActions: getSuggestedActions('meetup', context),
      fallback: true,
    };
  }

  // Reflection fallback
  if (responseType === 'reflection') {
    if (messageLower.match(/love|great|amazing|awesome/)) {
      return {
        message: `So glad you had a great time! 🎉 What made it special?`,
        suggestedActions: getSuggestedActions('reflection', context),
        fallback: true,
      };
    }
    if (messageLower.match(/terrible|bad|awful|sucked/)) {
      return {
        message: `Sorry to hear that didn't hit 😕 What went wrong? I'll remember for next time.`,
        suggestedActions: getSuggestedActions('reflection', context),
        fallback: true,
      };
    }
    return {
      message: `How was your experience? Would love to hear your thoughts!`,
      suggestedActions: getSuggestedActions('reflection', context),
      fallback: true,
    };
  }

  // Reddit hidden gems
  if (context.reddit?.hiddenGems?.length) {
    const gem = context.reddit.hiddenGems[0];
    return {
      message: `🔍 Local secret: ${gem.name} (${gem.type}) - ${gem.reason.substring(0, 80)}...`,
      suggestedActions: getSuggestedActions('recommendation', context),
      fallback: true,
    };
  }

  // Generic fallback
  return {
    message: `What kind of vibe are you after? Chill drinks, energetic spots, or something to explore?`,
    suggestedActions: getSuggestedActions('general', context),
    fallback: true,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Truncate message smartly (at sentence/word boundary)
 */
function truncateSmartly(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  // Try to truncate at sentence boundary
  const truncated = text.substring(0, maxLength - 3);
  const lastSentence = truncated.lastIndexOf('. ');
  const lastQuestion = truncated.lastIndexOf('? ');
  const lastExclaim = truncated.lastIndexOf('! ');
  
  const lastEnd = Math.max(lastSentence, lastQuestion, lastExclaim);
  
  if (lastEnd > maxLength * 0.6) {
    return truncated.substring(0, lastEnd + 1);
  }

  // Try to truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Estimate response quality (for logging/debugging)
 */
export function estimateResponseQuality(response: OracleGeneratedResponse): number {
  let score = 0.5; // Base score

  // Length check (too short or too long is bad)
  const len = response.message.length;
  if (len >= 50 && len <= 200) score += 0.2;
  else if (len >= 30 && len <= 280) score += 0.1;

  // Has suggested actions
  if (response.suggestedActions && response.suggestedActions.length > 0) {
    score += 0.1;
  }

  // Not a fallback
  if (!response.fallback) {
    score += 0.1;
  }

  // Contains emoji (engagement indicator)
  if (/[\u{1F300}-\u{1F9FF}]/u.test(response.message)) {
    score += 0.05;
  }

  // Ends with question (engagement)
  if (response.message.trim().endsWith('?')) {
    score += 0.05;
  }

  return Math.min(score, 1.0);
}

// ============================================================================
// BATCH/STREAMING (Future enhancements)
// ============================================================================

/**
 * Generate multiple responses for A/B testing (future feature)
 */
export async function generateResponseVariants(
  options: GenerateResponseOptions,
  count: number = 2
): Promise<OracleGeneratedResponse[]> {
  const variants: OracleGeneratedResponse[] = [];
  
  // Generate variants with different temperatures
  const temperatures = [0.7, 0.9, 1.0].slice(0, count);
  
  for (const temp of temperatures) {
    const response = await generateResponse({
      ...options,
      temperature: temp,
    });
    variants.push(response);
  }

  return variants;
}

/**
 * Export stats for monitoring
 */
export function getGeneratorStats(): { configured: boolean; model: string } {
  return {
    configured: isOpenAIConfigured(),
    model: 'gpt-4o-mini',
  };
}
