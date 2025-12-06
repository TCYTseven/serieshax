/**
 * Intent Classifier
 * Classifies user messages into intents for routing
 */

import { UserIntent } from '../types/database';

/**
 * Extended intent types (superset of UserIntent)
 * These map to database intents but provide more granularity
 */
export type ExtendedIntent = 
  | UserIntent 
  | 'vibe_check' 
  | 'reflection' 
  | 'recommendation'
  | 'greeting'
  | 'help';

/**
 * Intent classification result
 */
export interface IntentClassification {
  intent: ExtendedIntent;
  dbIntent: UserIntent;  // Mapped to database enum
  confidence: number;     // 0-1 confidence score
  keywords: string[];     // Matched keywords
}

/**
 * Keyword patterns for intent detection
 */
const INTENT_PATTERNS: Record<ExtendedIntent, string[]> = {
  meet: [
    'meet', 'meetup', 'friend', 'friends', 'people', 'social', 'hang out',
    'hangout', 'squad', 'crew', 'connect', 'network', 'group', 'together',
    'watch the game', 'watch party', 'find people', 'meet up'
  ],
  drink: [
    'drink', 'drinks', 'bar', 'bars', 'beer', 'cocktail', 'cocktails',
    'wine', 'pub', 'happy hour', 'nightlife', 'club', 'lounge', 'shots',
    'bourbon', 'whiskey', 'margarita', 'brewery', 'dive bar'
  ],
  learn: [
    'learn', 'class', 'classes', 'workshop', 'workshops', 'course', 'lesson',
    'pottery', 'cooking', 'dance', 'painting', 'art class', 'skill', 'teach',
    'tutorial', 'training', 'seminar', 'bootcamp'
  ],
  explore: [
    'explore', 'discover', 'new', 'adventure', 'things to do', 'what\'s happening',
    'events', 'going on', 'activities', 'experience', 'hidden gem', 'gems',
    'secret', 'underground', 'unique', 'cool spots', 'interesting'
  ],
  vibe_check: [
    'vibe', 'vibes', 'energy', 'mood', 'atmosphere', 'how is', 'how\'s',
    'what\'s the vibe', 'lit', 'dead', 'packed', 'busy', 'crowded',
    'worth it', 'hype', 'overhyped', 'underrated'
  ],
  reflection: [
    'loved', 'great time', 'amazing', 'awesome', 'terrible', 'sucked',
    'mid', 'was good', 'was bad', 'recommend', 'don\'t recommend',
    'review', 'feedback', 'thoughts on', 'rating', 'stars', 'last night'
  ],
  recommendation: [
    'recommend', 'suggestion', 'where should', 'best place', 'best spot',
    'top', 'favorite', 'good place', 'nice place', 'looking for', 'find me',
    'show me', 'suggest', 'ideas for'
  ],
  greeting: [
    'hi', 'hello', 'hey', 'sup', 'yo', 'what\'s up', 'howdy', 'good morning',
    'good afternoon', 'good evening', 'hola'
  ],
  help: [
    'help', 'how do', 'what can you', 'commands', 'options', 'menu',
    'what do you do', 'capabilities', 'features'
  ],
  general: [] // Catch-all, no specific keywords
};

/**
 * Map extended intents to database UserIntent enum
 */
function mapToDbIntent(intent: ExtendedIntent): UserIntent {
  switch (intent) {
    case 'meet':
      return 'meet';
    case 'drink':
      return 'drink';
    case 'learn':
      return 'learn';
    case 'explore':
    case 'recommendation':
      return 'explore';
    case 'vibe_check':
    case 'reflection':
    case 'greeting':
    case 'help':
    case 'general':
    default:
      return 'general';
  }
}

/**
 * Classify a message into an intent
 */
export function classifyIntent(message: string): IntentClassification {
  const messageLower = message.toLowerCase();
  const words = messageLower.split(/\s+/);
  
  let bestIntent: ExtendedIntent = 'general';
  let bestScore = 0;
  let matchedKeywords: string[] = [];

  // Check each intent's keywords
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS) as [ExtendedIntent, string[]][]) {
    let score = 0;
    const matches: string[] = [];
    
    for (const pattern of patterns) {
      if (pattern.includes(' ')) {
        // Multi-word pattern - check if phrase exists
        if (messageLower.includes(pattern)) {
          score += 2; // Phrase matches are stronger
          matches.push(pattern);
        }
      } else {
        // Single word - check if word exists
        if (words.includes(pattern) || messageLower.includes(pattern)) {
          score += 1;
          matches.push(pattern);
        }
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
      matchedKeywords = matches;
    }
  }

  // Calculate confidence (normalize score)
  const maxPossibleScore = 10; // Rough estimate
  const confidence = Math.min(bestScore / maxPossibleScore, 1);

  return {
    intent: bestIntent,
    dbIntent: mapToDbIntent(bestIntent),
    confidence: confidence > 0 ? confidence : 0.1, // Minimum confidence for general
    keywords: matchedKeywords,
  };
}

/**
 * Check if intent requires Polymarket context
 */
export function needsPolymarketContext(intent: ExtendedIntent, message: string): boolean {
  // Vibe checks often benefit from prediction market data
  if (intent === 'vibe_check') return true;
  
  // Check for sports/prediction keywords
  const predictionKeywords = [
    'odds', 'chances', 'prediction', 'polymarket', 'bet', 'betting',
    'who will win', 'gonna win', 'going to win', 'favorite'
  ];
  
  const messageLower = message.toLowerCase();
  return predictionKeywords.some(kw => messageLower.includes(kw));
}

/**
 * Check if intent requires Reddit context (secret gems)
 */
export function needsRedditContext(intent: ExtendedIntent, message: string): boolean {
  // Exploration often benefits from Reddit local knowledge
  if (intent === 'explore') return true;
  
  // Check for discovery keywords
  const discoveryKeywords = [
    'hidden', 'secret', 'underrated', 'locals', 'local', 'authentic',
    'off the beaten', 'unique', 'underground'
  ];
  
  const messageLower = message.toLowerCase();
  return discoveryKeywords.some(kw => messageLower.includes(kw));
}

/**
 * Check if intent is asking for recommendations
 */
export function isRecommendationIntent(intent: ExtendedIntent): boolean {
  return ['meet', 'drink', 'learn', 'explore', 'recommendation'].includes(intent);
}

/**
 * Check if intent is conversational (not needing data)
 */
export function isConversationalIntent(intent: ExtendedIntent): boolean {
  return ['greeting', 'help', 'general'].includes(intent);
}

/**
 * Detect sports teams mentioned in message
 */
export function detectSportsTeams(message: string): string[] {
  const messageLower = message.toLowerCase();
  
  const teams: Record<string, string> = {
    // NBA
    'knicks': 'New York Knicks',
    'lakers': 'Los Angeles Lakers',
    'celtics': 'Boston Celtics',
    'warriors': 'Golden State Warriors',
    'nets': 'Brooklyn Nets',
    'bulls': 'Chicago Bulls',
    'heat': 'Miami Heat',
    'mavs': 'Dallas Mavericks',
    'mavericks': 'Dallas Mavericks',
    'sixers': 'Philadelphia 76ers',
    '76ers': 'Philadelphia 76ers',
    'suns': 'Phoenix Suns',
    'bucks': 'Milwaukee Bucks',
    // NFL
    'giants': 'New York Giants',
    'jets': 'New York Jets',
    'eagles': 'Philadelphia Eagles',
    'chiefs': 'Kansas City Chiefs',
    'bills': 'Buffalo Bills',
    'cowboys': 'Dallas Cowboys',
    'patriots': 'New England Patriots',
    'packers': 'Green Bay Packers',
    '49ers': 'San Francisco 49ers',
    'ravens': 'Baltimore Ravens',
    'broncos': 'Denver Broncos',
    'dolphins': 'Miami Dolphins',
    // MLB
    'yankees': 'New York Yankees',
    'mets': 'New York Mets',
    'dodgers': 'Los Angeles Dodgers',
    'red sox': 'Boston Red Sox',
    'cubs': 'Chicago Cubs',
    'braves': 'Atlanta Braves',
    'astros': 'Houston Astros',
  };

  const found: string[] = [];
  for (const [keyword, fullName] of Object.entries(teams)) {
    if (messageLower.includes(keyword)) {
      found.push(fullName);
    }
  }

  return found;
}

/**
 * Extract topics from message
 */
export function extractTopics(message: string): string[] {
  const topics: string[] = [];
  const messageLower = message.toLowerCase();

  // Sports teams
  topics.push(...detectSportsTeams(message));

  // Crypto
  if (messageLower.includes('bitcoin') || messageLower.includes('btc')) {
    topics.push('Bitcoin');
  }
  if (messageLower.includes('ethereum') || messageLower.includes('eth')) {
    topics.push('Ethereum');
  }
  if (messageLower.includes('crypto')) {
    topics.push('Cryptocurrency');
  }

  // Politics
  if (messageLower.includes('trump')) {
    topics.push('Trump');
  }
  if (messageLower.includes('election')) {
    topics.push('Election');
  }

  // Food/Drink categories
  const foodDrink = ['pizza', 'sushi', 'tacos', 'ramen', 'burgers', 'coffee', 'brunch'];
  for (const item of foodDrink) {
    if (messageLower.includes(item)) {
      topics.push(item);
    }
  }

  return topics;
}

/**
 * Export a classifier helper object for convenience.
 */
export const intentClassifier = {
  classify: classifyIntent,
};
