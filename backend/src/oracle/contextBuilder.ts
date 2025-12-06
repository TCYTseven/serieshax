/**
 * Context Builder
 * Builds comprehensive context from multiple sources for the Oracle
 */

import { 
  Profile, 
  SeriesSpot, 
  CityVibe, 
  ConversationMessage,
  UserIntent 
} from '../types/database';
import { 
  ExtendedIntent, 
  IntentClassification,
  needsPolymarketContext,
  needsRedditContext,
  extractTopics
} from './intentClassifier';
import { 
  getUserProfile, 
  getConversationHistory,
  searchSpots,
  getSpotsForVibes,
  getCityVibe,
} from '../services';
import { getTrendingTopics } from '../services/vibeService';
import { 
  getPolymarketContext, 
  PolymarketContext 
} from '../integrations/polymarket';
import {
  getRedditContext,
  findHiddenGems,
  RedditContext
} from '../integrations/reddit';

/**
 * Extracted entities from user message
 */
export interface ExtractedEntities {
  city?: string;
  topic?: string;
  venue?: string;
  timeframe?: string;
  sportsTeams?: string[];
  vibes?: string[];
}

/**
 * Complete Oracle Context
 */
export interface OracleContext {
  // User data
  user: {
    id: string;
    phoneNumber: string;
  };
  profile: Profile | null;
  
  // Conversation
  conversationId: string;
  conversationHistory: ConversationMessage[];
  
  // Intent classification
  intentClassification: IntentClassification;
  dbIntent: UserIntent;
  
  // Extracted entities
  entities: ExtractedEntities;
  
  // External data (optional, based on intent)
  polymarket?: PolymarketContext | null;
  reddit?: RedditContext | null;
  
  // Local data
  cityVibe?: CityVibe | null;
  relevantSpots?: SeriesSpot[];
  trendingTopics?: CityVibe[];
  
  // Message data
  originalMessage: string;
  timestamp: Date;
}

/**
 * Context builder options
 */
export interface ContextBuilderOptions {
  fetchPolymarket?: boolean;
  fetchReddit?: boolean;
  fetchSpots?: boolean;
  fetchCityVibe?: boolean;
  maxSpots?: number;
  maxHistory?: number;
}

const DEFAULT_OPTIONS: ContextBuilderOptions = {
  fetchPolymarket: true,
  fetchReddit: true,
  fetchSpots: true,
  fetchCityVibe: true,
  maxSpots: 5,
  maxHistory: 10,
};

/**
 * Extract city from message or profile
 */
export function extractCity(message: string, profile?: Profile | null): string {
  const messageLower = message.toLowerCase();
  
  // Direct city mentions
  const cityMentions: Record<string, string> = {
    'nyc': 'new york',
    'new york': 'new york',
    'manhattan': 'new york',
    'brooklyn': 'new york',
    'la': 'los angeles',
    'los angeles': 'los angeles',
    'sf': 'san francisco',
    'san francisco': 'san francisco',
    'chicago': 'chicago',
    'miami': 'miami',
    'austin': 'austin',
    'seattle': 'seattle',
    'denver': 'denver',
    'boston': 'boston',
    'philly': 'philadelphia',
    'philadelphia': 'philadelphia',
    'dc': 'washington dc',
    'washington': 'washington dc',
  };

  for (const [mention, city] of Object.entries(cityMentions)) {
    if (messageLower.includes(mention)) {
      return city;
    }
  }

  // Pattern matching for "in [City]"
  const inCityMatch = message.match(/\b(?:in|near|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (inCityMatch) {
    return inCityMatch[1].toLowerCase();
  }

  // Fall back to profile city
  if (profile?.city) {
    return profile.city.toLowerCase();
  }

  // Default
  return 'new york';
}

/**
 * Extract timeframe from message
 */
export function extractTimeframe(message: string): string | undefined {
  const messageLower = message.toLowerCase();
  
  const timeframes: Record<string, string> = {
    'tonight': 'tonight',
    'this evening': 'tonight',
    'today': 'today',
    'tomorrow': 'tomorrow',
    'this weekend': 'this weekend',
    'saturday': 'saturday',
    'sunday': 'sunday',
    'friday': 'friday',
    'next week': 'next week',
    'now': 'now',
    'right now': 'now',
    'later': 'later today',
  };

  for (const [pattern, timeframe] of Object.entries(timeframes)) {
    if (messageLower.includes(pattern)) {
      return timeframe;
    }
  }

  return undefined;
}

/**
 * Extract venue name from message
 */
export function extractVenue(message: string): string | undefined {
  // Look for quoted venue names
  const quotedMatch = message.match(/"([^"]+)"|'([^']+)'/);
  if (quotedMatch) {
    return quotedMatch[1] || quotedMatch[2];
  }

  // Look for "at [Venue]" pattern
  const atMatch = message.match(/\bat\s+([A-Z][a-zA-Z\s]+?)(?:\s+(?:tonight|today|tomorrow|this|is|was)|\?|!|$)/);
  if (atMatch) {
    return atMatch[1].trim();
  }

  return undefined;
}

/**
 * Extract vibe keywords from message
 */
export function extractVibes(message: string): string[] {
  const messageLower = message.toLowerCase();
  const vibes: string[] = [];

  const vibeKeywords = [
    'chill', 'relaxed', 'laid back', 'laid-back',
    'energetic', 'lively', 'buzzing', 'exciting',
    'romantic', 'intimate', 'cozy', 'date night',
    'loud', 'party', 'wild', 'crazy',
    'quiet', 'peaceful', 'calm',
    'trendy', 'hip', 'cool', 'modern',
    'classic', 'old school', 'traditional',
    'fancy', 'upscale', 'nice', 'classy',
    'cheap', 'budget', 'affordable', 'dive'
  ];

  for (const vibe of vibeKeywords) {
    if (messageLower.includes(vibe)) {
      vibes.push(vibe);
    }
  }

  return vibes;
}

/**
 * Build entities from message and profile
 */
export function buildEntities(message: string, profile?: Profile | null): ExtractedEntities {
  const topics = extractTopics(message);
  
  return {
    city: extractCity(message, profile),
    topic: topics.length > 0 ? topics[0] : undefined,
    venue: extractVenue(message),
    timeframe: extractTimeframe(message),
    sportsTeams: topics.filter(t => 
      t.includes('Knicks') || t.includes('Lakers') || t.includes('Yankees') || 
      t.includes('Giants') || t.includes('Jets') || t.includes('Mets')
    ),
    vibes: extractVibes(message),
  };
}

/**
 * Build complete Oracle context
 */
export async function buildContext(
  userId: string,
  phoneNumber: string,
  conversationId: string,
  message: string,
  intentClassification: IntentClassification,
  options: ContextBuilderOptions = {}
): Promise<OracleContext> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  console.log(`\n📦 Building context for intent: ${intentClassification.intent}`);
  
  // Start with user profile (fast)
  const profile = await getUserProfile(userId).catch(() => null);
  
  // Build entities from message
  const entities = buildEntities(message, profile);
  console.log(`   📍 City: ${entities.city}, Topic: ${entities.topic || 'none'}`);
  
  // Initialize context
  const context: OracleContext = {
    user: { id: userId, phoneNumber },
    profile,
    conversationId,
    conversationHistory: [],
    intentClassification,
    dbIntent: intentClassification.dbIntent,
    entities,
    originalMessage: message,
    timestamp: new Date(),
  };

  // Parallel fetch operations
  const fetchPromises: Promise<void>[] = [];

  // Conversation history
  fetchPromises.push(
    getConversationHistory(conversationId, opts.maxHistory || 10)
      .then(history => { context.conversationHistory = history; })
      .catch(err => { console.log('   ⚠️ Could not fetch conversation history:', err.message); })
  );

  // Polymarket context (if needed)
  if (opts.fetchPolymarket && (
    needsPolymarketContext(intentClassification.intent, message) ||
    entities.topic
  )) {
    const topic = entities.topic || entities.sportsTeams?.[0] || 'trending';
    console.log(`   📊 Fetching Polymarket for: ${topic}`);
    fetchPromises.push(
      getPolymarketContext(topic)
        .then(pm => { context.polymarket = pm; })
        .catch(err => { console.log('   ⚠️ Polymarket fetch failed:', err.message); })
    );
  }

  // Reddit context (if needed)
  if (opts.fetchReddit && needsRedditContext(intentClassification.intent, message) && entities.city) {
    console.log(`   🔍 Fetching Reddit for: ${entities.city}`);
    fetchPromises.push(
      getRedditContext(entities.city, { topic: entities.topic, includeHiddenGems: true })
        .then(reddit => { context.reddit = reddit; })
        .catch(err => { console.log('   ⚠️ Reddit fetch failed:', err.message); })
    );
  }

  // Relevant spots
  if (opts.fetchSpots && entities.city) {
    console.log(`   📍 Fetching spots in: ${entities.city}`);
    fetchPromises.push(
      (async () => {
        try {
          // Try vibes first, fall back to general search
          if (profile?.vibe_tags && profile.vibe_tags.length > 0) {
            context.relevantSpots = await getSpotsForVibes(
              profile.vibe_tags, 
              entities.city!, 
              opts.maxSpots || 5
            );
          } else {
            context.relevantSpots = await searchSpots(entities.city!, {
              min_rating: 4.0
            });
          }
          console.log(`   📍 Found ${context.relevantSpots?.length || 0} spots`);
        } catch (err: any) {
          console.log('   ⚠️ Spot search failed:', err.message);
        }
      })()
    );
  }

  // City vibe
  if (opts.fetchCityVibe && entities.city && entities.topic) {
    fetchPromises.push(
      getCityVibe(entities.city, entities.topic)
        .then(vibe => { context.cityVibe = vibe; })
        .catch(() => {})
    );
  }

  // Trending topics (from vibeService, not reddit)
  if (opts.fetchCityVibe && entities.city) {
    fetchPromises.push(
      getTrendingTopics(entities.city, 5)
        .then(topics => { context.trendingTopics = topics; })
        .catch(() => {})
    );
  }

  // Wait for all fetches
  await Promise.all(fetchPromises);

  console.log(`   ✅ Context built: history=${context.conversationHistory.length}, spots=${context.relevantSpots?.length || 0}`);
  
  return context;
}

/**
 * Build a minimal context (for fast responses)
 */
export async function buildMinimalContext(
  userId: string,
  phoneNumber: string,
  conversationId: string,
  message: string,
  intentClassification: IntentClassification
): Promise<OracleContext> {
  return buildContext(userId, phoneNumber, conversationId, message, intentClassification, {
    fetchPolymarket: false,
    fetchReddit: false,
    fetchSpots: false,
    fetchCityVibe: false,
    maxHistory: 5,
  });
}

/**
 * Check if context has external data
 */
export function hasExternalData(context: OracleContext): boolean {
  return !!(context.polymarket || context.reddit || context.cityVibe);
}

/**
 * Get context summary for logging
 */
export function getContextSummary(context: OracleContext): string {
  const parts: string[] = [
    `Intent: ${context.intentClassification.intent} (${Math.round(context.intentClassification.confidence * 100)}%)`,
    `City: ${context.entities.city || 'unknown'}`,
  ];

  if (context.profile?.display_name) {
    parts.push(`User: ${context.profile.display_name}`);
  }
  if (context.conversationHistory.length > 0) {
    parts.push(`History: ${context.conversationHistory.length} msgs`);
  }
  if (context.polymarket?.markets.length) {
    parts.push(`Polymarket: ${context.polymarket.markets.length} markets`);
  }
  if (context.reddit?.topPosts?.length) {
    parts.push(`Reddit: ${context.reddit.topPosts.length} posts`);
  }
  if (context.relevantSpots?.length) {
    parts.push(`Spots: ${context.relevantSpots.length}`);
  }

  return parts.join(' | ');
}
