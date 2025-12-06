/**
 * Oracle Service
 * AI-powered conversation handler using OpenAI
 * Enhanced with Polymarket prediction market context
 */

import OpenAI from 'openai';
import { env } from '../config/env';
import { 
  Profile, 
  UserIntent, 
  SeriesSpot,
  ConversationMessage 
} from '../types/database';
import { 
  getPolymarketContext, 
  getSportsEventPrediction,
  PolymarketContext 
} from '../integrations/polymarket';

// Initialize OpenAI client
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

/**
 * System prompt for the Social Oracle
 */
const SYSTEM_PROMPT = `You are the Social Oracle, a friendly AI concierge that helps people discover amazing social experiences in their city. You're texting with users via SMS, so keep responses SHORT (under 160 chars when possible, max 320 chars).

Your personality:
- Warm, casual, and enthusiastic (use emojis sparingly 🎉)
- Local insider vibes - like a friend who knows all the best spots
- Helpful but not pushy
- You know about prediction markets and can share interesting takes

Your capabilities:
- Recommend spots (restaurants, bars, cafes, activities) based on user vibes
- Help users find places matching their mood/intent
- Share Polymarket predictions for sports, crypto, politics (great icebreakers!)
- Learn user preferences over time
- Suggest meetup ideas

When sharing prediction market info:
- Share the probability as a percentage
- Make it conversational ("Polymarket has X at 72%...")
- Ask for their opinion to spark conversation
- Great for sports games, crypto prices, elections

When recommending spots, mention:
- Name and type of place
- Why it matches their vibe
- One standout feature

If you don't have enough info, ask ONE clarifying question.

Keep it conversational and fun - you're helping people have a great time!`;

/**
 * Detect user intent from message
 */
export async function detectIntent(message: string): Promise<UserIntent> {
  const messageLower = message.toLowerCase();
  
  // Simple keyword-based detection (fast, no API call)
  if (messageLower.includes('meet') || messageLower.includes('friend') || messageLower.includes('people') || messageLower.includes('social')) {
    return 'meet';
  }
  if (messageLower.includes('drink') || messageLower.includes('bar') || messageLower.includes('beer') || messageLower.includes('cocktail') || messageLower.includes('wine')) {
    return 'drink';
  }
  if (messageLower.includes('learn') || messageLower.includes('class') || messageLower.includes('workshop') || messageLower.includes('course')) {
    return 'learn';
  }
  if (messageLower.includes('explore') || messageLower.includes('discover') || messageLower.includes('new') || messageLower.includes('adventure')) {
    return 'explore';
  }
  
  return 'general';
}

/**
 * Extract city from message or profile
 */
export function extractCity(message: string, profile?: Profile | null): string {
  // Common city patterns
  const cityPatterns = [
    /in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    /around\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    /near\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
  ];

  for (const pattern of cityPatterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // Fall back to profile city
  if (profile?.city) {
    return profile.city;
  }

  // Default
  return 'New York';
}

/**
 * Build context for OpenAI from conversation history
 */
function buildMessages(
  userMessage: string,
  conversationHistory: ConversationMessage[],
  profile?: Profile | null,
  spots?: SeriesSpot[],
  polymarketContext?: PolymarketContext | null
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT }
  ];

  // Add user context if available
  if (profile) {
    const userContext = buildUserContext(profile);
    messages.push({
      role: 'system',
      content: `User context: ${userContext}`
    });
  }

  // Add spot recommendations if available
  if (spots && spots.length > 0) {
    const spotsContext = spots.map(s => 
      `- ${s.name} (${s.spot_type}): ${s.description || 'Great spot'} - ${s.budget_tier} budget`
    ).join('\n');
    messages.push({
      role: 'system',
      content: `Available spots to recommend:\n${spotsContext}`
    });
  }

  // Add Polymarket context if available
  if (polymarketContext && polymarketContext.markets.length > 0) {
    let polyContext = `Polymarket prediction data for "${polymarketContext.topic}":\n`;
    
    polymarketContext.markets.slice(0, 3).forEach(m => {
      polyContext += `- ${m.question}: ${Math.round(m.probability * 100)}% YES`;
      if (m.isHot) polyContext += ' 🔥';
      polyContext += '\n';
    });
    
    if (polymarketContext.sportsPrediction) {
      const sp = polymarketContext.sportsPrediction;
      polyContext += `\nSports prediction: ${sp.favored} is favored at ${Math.round(sp.probability * 100)}% over ${sp.underdog}`;
    }
    
    if (polymarketContext.suggestedIcebreaker) {
      polyContext += `\n\nSuggested icebreaker: "${polymarketContext.suggestedIcebreaker}"`;
    }
    
    messages.push({
      role: 'system',
      content: polyContext
    });
  }

  // Add conversation history (last 10 messages)
  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }
  }

  // Add current message
  messages.push({ role: 'user', content: userMessage });

  return messages;
}

/**
 * Build user context string from profile
 */
function buildUserContext(profile: Profile): string {
  const parts: string[] = [];
  
  if (profile.display_name) {
    parts.push(`Name: ${profile.display_name}`);
  }
  if (profile.city) {
    parts.push(`City: ${profile.city}`);
  }
  if (profile.vibe_tags && profile.vibe_tags.length > 0) {
    parts.push(`Vibes: ${profile.vibe_tags.join(', ')}`);
  }
  if (profile.interests && profile.interests.length > 0) {
    parts.push(`Interests: ${profile.interests.join(', ')}`);
  }
  if (profile.preferred_budget) {
    parts.push(`Budget: ${profile.preferred_budget}`);
  }
  if (profile.food_genres && profile.food_genres.length > 0) {
    parts.push(`Food preferences: ${profile.food_genres.join(', ')}`);
  }

  return parts.join('. ') || 'New user, no preferences set yet.';
}

/**
 * Detect if message is asking about prediction markets or sports
 */
export function detectPredictionTopic(message: string): string | null {
  const messageLower = message.toLowerCase();
  
  // Sports teams
  const sportsTeams = [
    'knicks', 'lakers', 'celtics', 'warriors', 'nets', 'bulls', 'heat', 'mavs', 'mavericks',
    'yankees', 'mets', 'dodgers', 'red sox', 'cubs', 'giants', 'eagles', 'chiefs', 'bills',
    'cowboys', 'patriots', 'packers', '49ers', 'ravens', 'broncos', 'jets', 'dolphins'
  ];
  
  for (const team of sportsTeams) {
    if (messageLower.includes(team)) {
      return team;
    }
  }
  
  // Crypto
  if (messageLower.includes('bitcoin') || messageLower.includes('btc')) return 'bitcoin';
  if (messageLower.includes('ethereum') || messageLower.includes('eth')) return 'ethereum';
  if (messageLower.includes('crypto')) return 'crypto';
  
  // Politics
  if (messageLower.includes('trump')) return 'trump';
  if (messageLower.includes('election') || messageLower.includes('president')) return 'election';
  
  // Direct prediction queries
  if (messageLower.includes('polymarket') || messageLower.includes('prediction') || 
      messageLower.includes('odds') || messageLower.includes('chances')) {
    // Try to extract topic
    const words = message.split(/\s+/);
    for (const word of words) {
      if (word.length > 3 && !['what', 'will', 'think', 'about', 'the', 'odds', 'chances', 'polymarket'].includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
    }
  }
  
  return null;
}

/**
 * Generate a response using OpenAI
 */
export async function generateResponse(
  userMessage: string,
  conversationHistory: ConversationMessage[] = [],
  profile?: Profile | null,
  spots?: SeriesSpot[],
  polymarketContext?: PolymarketContext | null
): Promise<string> {
  // Check if OpenAI is configured
  if (!isOpenAIConfigured()) {
    return generateFallbackResponse(userMessage, spots, polymarketContext);
  }

  try {
    const openai = getOpenAI();
    const messages = buildMessages(userMessage, conversationHistory, profile, spots, polymarketContext);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 150, // Keep responses short for SMS
      temperature: 0.8,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      return generateFallbackResponse(userMessage, spots, polymarketContext);
    }

    // Ensure response isn't too long for SMS
    if (response.length > 320) {
      return response.substring(0, 317) + '...';
    }

    return response;

  } catch (error) {
    console.error('OpenAI error:', error);
    return generateFallbackResponse(userMessage, spots, polymarketContext);
  }
}

/**
 * Generate response with automatic Polymarket context
 * Use this when you want the Oracle to automatically fetch prediction data
 */
export async function generateResponseWithPredictions(
  userMessage: string,
  conversationHistory: ConversationMessage[] = [],
  profile?: Profile | null,
  spots?: SeriesSpot[]
): Promise<string> {
  // Detect if user is asking about something we have prediction data for
  const predictionTopic = detectPredictionTopic(userMessage);
  
  let polymarketContext: PolymarketContext | null = null;
  
  if (predictionTopic) {
    console.log(`📊 Detected prediction topic: "${predictionTopic}"`);
    try {
      polymarketContext = await getPolymarketContext(predictionTopic);
    } catch (error) {
      console.error('Error fetching Polymarket context:', error);
    }
  }
  
  return generateResponse(userMessage, conversationHistory, profile, spots, polymarketContext);
}

/**
 * Fallback response when OpenAI is not available
 */
function generateFallbackResponse(
  message: string, 
  spots?: SeriesSpot[],
  polymarketContext?: PolymarketContext | null
): string {
  const messageLower = message.toLowerCase();

  // If we have Polymarket context, use the suggested icebreaker
  if (polymarketContext && polymarketContext.suggestedIcebreaker) {
    return polymarketContext.suggestedIcebreaker;
  }

  // If we have sports prediction
  if (polymarketContext?.sportsPrediction) {
    const sp = polymarketContext.sportsPrediction;
    return `📊 ${sp.favored} is favored at ${Math.round(sp.probability * 100)}% over ${sp.underdog}. What do you think?`;
  }

  // If we have spots to recommend
  if (spots && spots.length > 0) {
    const spot = spots[0];
    return `Check out ${spot.name}! It's a great ${spot.spot_type.replace('_', ' ')} with ${spot.vibe_descriptors?.[0] || 'awesome'} vibes. 🎉`;
  }

  // Generic responses based on keywords
  if (messageLower.includes('hi') || messageLower.includes('hello') || messageLower.includes('hey')) {
    return "Hey! 👋 I'm the Social Oracle. Looking for somewhere fun to hang out? Tell me what vibe you're after!";
  }

  if (messageLower.includes('help')) {
    return "I can help you find cool spots! Just tell me: What vibe are you in the mood for? (chill, energetic, romantic, etc.)";
  }

  if (messageLower.includes('thank')) {
    return "You're welcome! Have an amazing time! 🎉";
  }

  // Default
  return "What kind of place are you looking for? A chill café, energetic bar, or something else? 🤔";
}

/**
 * Generate a welcome message for new users
 */
export function generateWelcomeMessage(displayName?: string): string {
  const name = displayName ? ` ${displayName}` : '';
  return `Hey${name}! 👋 I'm the Social Oracle - your guide to the city's hidden gems. What kind of vibe are you looking for tonight?`;
}

/**
 * Generate spot recommendation message
 */
export function formatSpotRecommendation(spot: SeriesSpot): string {
  const vibeText = spot.vibe_descriptors?.[0] || 'great';
  const budgetEmoji = {
    'budget': '💰',
    'moderate': '💰💰',
    'upscale': '💰💰💰',
    'luxury': '💎'
  }[spot.budget_tier] || '';

  return `${spot.name} - ${spot.spot_type.replace('_', ' ')} ${budgetEmoji}\n${spot.description || `A ${vibeText} spot worth checking out!`}`;
}

/**
 * Generate multiple spot recommendations
 */
export function formatSpotList(spots: SeriesSpot[], maxSpots: number = 3): string {
  if (spots.length === 0) {
    return "Hmm, I couldn't find any spots matching that. Want to try different vibes?";
  }

  const topSpots = spots.slice(0, maxSpots);
  const formatted = topSpots.map((spot, i) => 
    `${i + 1}. ${spot.name} (${spot.spot_type.replace('_', ' ')})`
  ).join('\n');

  return `Here are some spots for you:\n${formatted}\n\nWant details on any of these?`;
}
