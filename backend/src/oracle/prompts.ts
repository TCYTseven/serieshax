/**
 * Oracle Prompts & Templates
 * Defines the Social Oracle's personality and response templates
 */

import { ExtendedIntent } from './intentClassifier';
import { OracleContext } from './contextBuilder';
import { Profile, SeriesSpot } from '../types/database';
import { PolymarketContext } from '../integrations/polymarket';
import { RedditContext } from '../integrations/reddit';

// ============================================================================
// THE ORACLE'S CORE PERSONALITY
// ============================================================================

export const ORACLE_PERSONALITY = `You are the Social Oracle, a charismatic AI concierge who helps people discover amazing social experiences in their city. You're texting via SMS, so responses must be SHORT (under 160 chars when possible, max 280 chars).

## Your Personality
- Warm, witty, and slightly mysterious (you're an "oracle" after all)
- Local insider energy - like a friend who knows all the secret spots
- Genuinely curious about people and what makes them tick
- Playfully provocative with predictions and takes (without being controversial)
- Uses emojis sparingly but effectively (1-2 max per message)

## Communication Style
- Start with energy, not pleasantries ("Ooh nice choice!" not "That's great!")
- Ask ONE question max - keep conversations flowing
- Be specific over generic ("Try the back patio at sunset" vs "It's nice")
- Match the user's energy level
- When uncertain, ask rather than guess

## What You NEVER Do
- Give long lists (3 items max)
- Lecture or over-explain
- Use corporate speak or filler words
- Make assumptions about demographics
- Sound like a customer service bot`;

// ============================================================================
// RESPONSE TYPE SYSTEM PROMPTS
// ============================================================================

export const RESPONSE_TYPE_PROMPTS: Record<string, string> = {
  vibe_check: `You're doing a VIBE CHECK - sharing the energy/pulse of something.
- Lead with the mood/energy reading
- Use prediction market data if available to add intrigue
- Ask for their hot take to spark engagement
- Make it feel like insider gossip`,

  icebreaker: `You're generating an ICEBREAKER - a conversation starter.
- Use interesting data points (predictions, local buzz) as hooks
- Frame it as "what do you think?" or "hot take:"
- Make it shareable - something they'd want to debate
- Tie it to something happening NOW`,

  recommendation: `You're giving a RECOMMENDATION - suggesting a spot or activity.
- Lead with the ONE best option (not a list)
- Explain WHY it fits them specifically
- Include ONE standout detail that sells it
- Make it easy to act on ("They close at 10" or "Reservations recommended")`,

  meetup: `You're helping with a MEETUP - facilitating social connection.
- Focus on reducing social friction
- Suggest a specific spot + time when possible
- Give them an easy conversation starter for when they meet
- Keep the energy warm and encouraging`,

  reflection: `You're handling a REFLECTION - processing their experience.
- Acknowledge their feelings first
- If positive: celebrate and reinforce
- If negative: empathize without dwelling
- Ask what they'd do differently (learning moment)
- Update your mental model of their preferences`,

  general: `You're having a GENERAL conversation - be helpful and natural.
- Be conversational and warm
- Help them discover what they're actually looking for
- Guide toward one of your capabilities naturally
- If truly off-topic, be charming but redirect`
};

// ============================================================================
// CONTEXT INJECTION TEMPLATES
// ============================================================================

/**
 * Build user context string for the LLM
 */
export function buildUserContextPrompt(profile: Profile | null): string {
  if (!profile) {
    return 'New user - no preferences known yet. Be extra welcoming and curious about what they like.';
  }

  const parts: string[] = [];
  
  if (profile.display_name) {
    parts.push(`Name: ${profile.display_name}`);
  }
  if (profile.city) {
    parts.push(`City: ${profile.city}`);
  }
  if (profile.vibe_tags && profile.vibe_tags.length > 0) {
    parts.push(`Their vibe: ${profile.vibe_tags.join(', ')}`);
  }
  if (profile.interests && profile.interests.length > 0) {
    parts.push(`Interests: ${profile.interests.join(', ')}`);
  }
  if (profile.preferred_budget) {
    parts.push(`Budget preference: ${profile.preferred_budget}`);
  }
  if (profile.sports_teams) {
    const teams = Object.values(profile.sports_teams).flat();
    if (teams.length > 0) {
      parts.push(`Sports fan: ${teams.slice(0, 3).join(', ')}`);
    }
  }
  if (profile.food_genres && profile.food_genres.length > 0) {
    parts.push(`Food favorites: ${profile.food_genres.join(', ')}`);
  }
  if (profile.social_anxiety && profile.social_anxiety !== 'none') {
    parts.push(`Note: May prefer ${profile.social_anxiety === 'high' ? 'quieter, more intimate' : 'comfortable, low-key'} settings`);
  }
  
  return parts.length > 0 
    ? `USER CONTEXT:\n${parts.join('\n')}`
    : 'Returning user but limited preference data. Ask about what they enjoy.';
}

/**
 * Build spot recommendations context for the LLM
 */
export function buildSpotsContextPrompt(spots: SeriesSpot[] | undefined): string {
  if (!spots || spots.length === 0) {
    return '';
  }

  const spotsInfo = spots.slice(0, 5).map(spot => {
    const details: string[] = [
      `${spot.name} (${spot.spot_type.replace('_', ' ')})`,
    ];
    
    if (spot.description) {
      details.push(`  "${spot.description}"`);
    }
    if (spot.vibe_descriptors && spot.vibe_descriptors.length > 0) {
      details.push(`  Vibe: ${spot.vibe_descriptors.slice(0, 3).join(', ')}`);
    }
    details.push(`  Budget: ${spot.budget_tier}`);
    if (spot.avg_rating) {
      details.push(`  Rating: ${spot.avg_rating.toFixed(1)}⭐`);
    }
    if (spot.address) {
      details.push(`  Location: ${spot.address}`);
    }
    
    return details.join('\n');
  }).join('\n\n');

  return `AVAILABLE SPOTS TO RECOMMEND:\n${spotsInfo}`;
}

/**
 * Build Polymarket context for the LLM
 */
export function buildPolymarketContextPrompt(polymarket: PolymarketContext | null | undefined): string {
  if (!polymarket || polymarket.markets.length === 0) {
    return '';
  }

  let prompt = `PREDICTION MARKET DATA (from Polymarket):\n`;
  prompt += `Topic: "${polymarket.topic}"\n\n`;

  // Hot markets first
  const hotMarkets = polymarket.markets.filter(m => m.isHot).slice(0, 2);
  const regularMarkets = polymarket.markets.filter(m => !m.isHot).slice(0, 2);
  
  [...hotMarkets, ...regularMarkets].slice(0, 3).forEach(market => {
    prompt += `• ${market.question}\n`;
    prompt += `  → ${Math.round(market.probability * 100)}% YES`;
    if (market.isHot) prompt += ' 🔥 (hot market)';
    prompt += '\n';
  });

  if (polymarket.sportsPrediction) {
    const sp = polymarket.sportsPrediction;
    prompt += `\nSPORTS PREDICTION:\n`;
    prompt += `${sp.favored} vs ${sp.underdog}\n`;
    prompt += `${sp.favored} favored at ${Math.round(sp.probability * 100)}%\n`;
  }

  if (polymarket.suggestedIcebreaker) {
    prompt += `\nSuggested hook: "${polymarket.suggestedIcebreaker}"`;
  }

  return prompt;
}

/**
 * Build Reddit context for the LLM
 */
export function buildRedditContextPrompt(reddit: RedditContext | null | undefined): string {
  if (!reddit) {
    return '';
  }

  let prompt = `LOCAL BUZZ (from Reddit):\n`;
  prompt += `City: ${reddit.city}\n`;

  if (reddit.topPosts && reddit.topPosts.length > 0) {
    prompt += `\nHot topics:\n`;
    reddit.topPosts.slice(0, 3).forEach(post => {
      prompt += `• "${post.title}" (${post.score} upvotes)\n`;
    });
  }

  if (reddit.hiddenGems && reddit.hiddenGems.length > 0) {
    prompt += `\nHidden gems locals mention:\n`;
    reddit.hiddenGems.slice(0, 3).forEach(gem => {
      prompt += `• ${gem.name} (${gem.type}) - ${gem.reason}\n`;
    });
  }

  if (reddit.sentiment) {
    const sentimentEmoji = reddit.sentimentScore > 0.3 ? '🔥' : reddit.sentimentScore < -0.3 ? '😬' : '😐';
    prompt += `\nLocal mood: ${reddit.sentiment} ${sentimentEmoji}\n`;
  }

  if (reddit.localBuzz && reddit.localBuzz.length > 0) {
    prompt += `\nBuzzing topics: ${reddit.localBuzz.slice(0, 3).join(', ')}\n`;
  }

  return prompt;
}

/**
 * Build conversation history context
 */
export function buildConversationHistoryPrompt(
  history: Array<{ role: string; content: string }>,
  maxMessages: number = 6
): string {
  if (!history || history.length === 0) {
    return '';
  }

  const recent = history.slice(-maxMessages);
  const formatted = recent.map(msg => {
    const role = msg.role === 'user' ? 'User' : 'Oracle';
    return `${role}: ${msg.content}`;
  }).join('\n');

  return `RECENT CONVERSATION:\n${formatted}`;
}

/**
 * Build entities/context summary
 */
export function buildEntitiesPrompt(context: OracleContext): string {
  const parts: string[] = [];
  
  if (context.entities.city) {
    parts.push(`City: ${context.entities.city}`);
  }
  if (context.entities.topic) {
    parts.push(`Topic: ${context.entities.topic}`);
  }
  if (context.entities.venue) {
    parts.push(`Mentioned venue: ${context.entities.venue}`);
  }
  if (context.entities.timeframe) {
    parts.push(`Timeframe: ${context.entities.timeframe}`);
  }
  if (context.entities.vibes && context.entities.vibes.length > 0) {
    parts.push(`Vibes mentioned: ${context.entities.vibes.join(', ')}`);
  }
  if (context.entities.sportsTeams && context.entities.sportsTeams.length > 0) {
    parts.push(`Teams mentioned: ${context.entities.sportsTeams.join(', ')}`);
  }

  if (context.trendingTopics && context.trendingTopics.length > 0) {
    const trending = context.trendingTopics
      .slice(0, 3)
      .map(t => `${t.topic} (${t.opinion_count} opinions)`)
      .join(', ');
    parts.push(`Trending in city: ${trending}`);
  }

  return parts.length > 0 
    ? `DETECTED CONTEXT:\n${parts.join('\n')}`
    : '';
}

// ============================================================================
// SUGGESTED ACTIONS TEMPLATES
// ============================================================================

export interface SuggestedAction {
  label: string;
  action: string;
}

/**
 * Generate suggested actions based on response type
 */
export function getSuggestedActions(
  responseType: string,
  context: OracleContext
): SuggestedAction[] {
  switch (responseType) {
    case 'vibe_check':
      return [
        { label: '🔥 More predictions', action: 'show_more_predictions' },
        { label: '📍 Find a spot', action: 'start_recommendation' },
      ];
    
    case 'icebreaker':
      return [
        { label: '👥 Help me meet people', action: 'start_meetup' },
        { label: '🎲 Another icebreaker', action: 'new_icebreaker' },
      ];
    
    case 'recommendation':
      return [
        { label: '📍 Directions', action: 'get_directions' },
        { label: '🔄 Show more options', action: 'more_recommendations' },
        { label: '👥 Who else is going?', action: 'find_others' },
      ];
    
    case 'meetup':
      return [
        { label: '✅ I\'m in!', action: 'confirm_meetup' },
        { label: '📅 Different time', action: 'reschedule' },
        { label: '📍 Different spot', action: 'change_venue' },
      ];
    
    case 'reflection':
      return [
        { label: '⭐ Leave a review', action: 'write_review' },
        { label: '🔄 Find something new', action: 'new_recommendation' },
      ];
    
    default:
      return [
        { label: '🍻 Find drinks', action: 'find_drinks' },
        { label: '🍕 Find food', action: 'find_food' },
        { label: '👥 Meet people', action: 'start_meetup' },
      ];
  }
}

// ============================================================================
// FULL PROMPT BUILDER
// ============================================================================

export interface PromptBuilderOptions {
  responseType: string;
  userMessage: string;
  context: OracleContext;
  maxContextLength?: number;
}

/**
 * Build the complete prompt for the LLM
 */
export function buildFullPrompt(options: PromptBuilderOptions): string {
  const { responseType, userMessage, context, maxContextLength = 2000 } = options;

  const sections: string[] = [];

  // 1. Core personality (always included)
  sections.push(ORACLE_PERSONALITY);

  // 2. Response type specific instructions
  const typePrompt = RESPONSE_TYPE_PROMPTS[responseType] || RESPONSE_TYPE_PROMPTS.general;
  sections.push(`\n## CURRENT TASK\n${typePrompt}`);

  // 3. User context
  const userContext = buildUserContextPrompt(context.profile);
  if (userContext) {
    sections.push(`\n${userContext}`);
  }

  // 4. Detected entities
  const entitiesPrompt = buildEntitiesPrompt(context);
  if (entitiesPrompt) {
    sections.push(`\n${entitiesPrompt}`);
  }

  // 5. Available spots (if relevant)
  if (['recommendation', 'meetup'].includes(responseType)) {
    const spotsPrompt = buildSpotsContextPrompt(context.relevantSpots);
    if (spotsPrompt) {
      sections.push(`\n${spotsPrompt}`);
    }
  }

  // 6. Polymarket data (if relevant)
  if (['vibe_check', 'icebreaker', 'general'].includes(responseType)) {
    const polymarketPrompt = buildPolymarketContextPrompt(context.polymarket);
    if (polymarketPrompt) {
      sections.push(`\n${polymarketPrompt}`);
    }
  }

  // 7. Reddit data (if relevant)
  if (['recommendation', 'icebreaker', 'explore'].includes(responseType) || context.reddit) {
    const redditPrompt = buildRedditContextPrompt(context.reddit);
    if (redditPrompt) {
      sections.push(`\n${redditPrompt}`);
    }
  }

  // 8. Conversation history (limited to stay within context)
  const historyPrompt = buildConversationHistoryPrompt(context.conversationHistory);
  if (historyPrompt) {
    sections.push(`\n${historyPrompt}`);
  }

  // 9. Current message
  sections.push(`\nUSER'S CURRENT MESSAGE:\n"${userMessage}"`);

  // 10. Final instructions
  sections.push(`\nREMEMBER: Keep response under 280 chars. Be specific and actionable.`);

  // Join and potentially truncate
  let fullPrompt = sections.join('\n');
  
  if (fullPrompt.length > maxContextLength) {
    // Truncate from the middle sections (preserve personality and current message)
    fullPrompt = fullPrompt.substring(0, maxContextLength - 100) + '\n...[context truncated]...\n' + sections.slice(-2).join('\n');
  }

  return fullPrompt;
}

// ============================================================================
// SPECIALIZED PROMPT BUILDERS
// ============================================================================

/**
 * Build a greeting prompt
 */
export function buildGreetingPrompt(
  userName: string | undefined,
  isReturningUser: boolean,
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
): string {
  const greeting = {
    morning: 'Good morning',
    afternoon: 'Hey',
    evening: 'Good evening', 
    night: 'Hey night owl',
  }[timeOfDay];

  if (isReturningUser && userName) {
    return `Generate a short, warm welcome back for ${userName}. They've used the app before. Time: ${timeOfDay}. Ask what they're in the mood for today. Keep under 160 chars.`;
  }

  if (userName) {
    return `Generate a welcoming first message for ${userName}. Introduce yourself as the Social Oracle briefly. Time: ${timeOfDay}. Keep under 160 chars.`;
  }

  return `Generate a welcoming first message for a new user. Introduce yourself as the Social Oracle briefly. Time: ${timeOfDay}. Keep under 160 chars.`;
}

/**
 * Build a recommendation prompt with specific constraints
 */
export function buildRecommendationPrompt(
  spot: SeriesSpot,
  userVibes: string[],
  matchReason?: string
): string {
  return `Recommend "${spot.name}" to the user.
  
Spot details:
- Type: ${spot.spot_type.replace('_', ' ')}
- Vibe: ${spot.vibe_descriptors?.join(', ') || 'casual'}
- Budget: ${spot.budget_tier}
${spot.description ? `- About: ${spot.description}` : ''}
${matchReason ? `- Why it matches: ${matchReason}` : ''}

User's vibes: ${userVibes.join(', ') || 'exploring'}

Make the recommendation personal. Explain WHY this spot fits them. Keep under 200 chars.`;
}

/**
 * Build an error recovery prompt
 */
export function buildErrorRecoveryPrompt(errorType: string): string {
  const errorResponses: Record<string, string> = {
    rate_limit: "Whoa, you're on fire! 🔥 Give me a sec to catch up. Try again in a minute?",
    no_spots_found: "Hmm, coming up empty on that one. Can you tell me more about what vibe you're after?",
    api_error: "My crystal ball is a bit foggy right now 🔮 Try asking again in a sec?",
    invalid_city: "I'm not super familiar with that area yet. What city are you exploring?",
    generic: "Oops, something went sideways on my end. Mind trying that again?",
  };

  return errorResponses[errorType] || errorResponses.generic;
}
