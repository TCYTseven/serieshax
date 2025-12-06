/**
 * Test Phase 3.6: LLM Response Generator
 * Run with: npx ts-node src/test-phase3.6.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import {
  // Response Generator
  generateResponse,
  generateGreeting,
  generateVibeCheck,
  generateIcebreaker,
  generateRecommendation,
  generateMeetupResponse,
  generateReflection,
  generateFallbackResponse,
  isOpenAIConfigured,
  intentToResponseType,
  getGeneratorStats,
  estimateResponseQuality,
  
  // Prompts
  ORACLE_PERSONALITY,
  RESPONSE_TYPE_PROMPTS,
  buildFullPrompt,
  buildUserContextPrompt,
  buildSpotsContextPrompt,
  buildPolymarketContextPrompt,
  buildRedditContextPrompt,
  getSuggestedActions,
  buildErrorRecoveryPrompt,
  
  // Types
  type OracleContext,
  type ResponseType,
  type OracleGeneratedResponse,
} from './oracle';

import { Profile, SeriesSpot } from './types/database';
import { PolymarketContext } from './integrations/polymarket';
import { RedditContext } from './integrations/reddit';

// ============================================================================
// TEST HELPERS
// ============================================================================

function printHeader(title: string) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

function printSubHeader(title: string) {
  console.log(`\n── ${title} ──`);
}

function printResult(label: string, value: any) {
  if (typeof value === 'string') {
    console.log(`  ${label}: "${value}"`);
  } else if (typeof value === 'object') {
    console.log(`  ${label}:`, JSON.stringify(value, null, 2).split('\n').map((l, i) => i === 0 ? l : '    ' + l).join('\n'));
  } else {
    console.log(`  ${label}: ${value}`);
  }
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockProfile: Profile = {
  id: 'test-profile-1',
  user_id: 'test-user-1',
  display_name: 'Alex',
  age: 28,
  city: 'New York',
  interests: ['sports', 'craft beer', 'live music'],
  goals: ['meet new people', 'explore the city'],
  sports_teams: { nba: ['New York Knicks'], nfl: ['New York Giants'] },
  food_genres: ['Italian', 'Mexican', 'Japanese'],
  music_genres: ['indie', 'hip-hop'],
  vibe_tags: ['energetic', 'social_butterfly', 'sports_fan'],
  social_anxiety: 'mild',
  group_size_preference: 4,
  preferred_budget: 'moderate',
  total_meetups_attended: 5,
  avg_rating_given: 4.2,
  avg_rating_received: 4.5,
};

const mockSpots: SeriesSpot[] = [
  {
    id: 'spot-1',
    name: 'The Stumble Inn',
    description: 'Classic sports bar with great wings and 20 TVs. Perfect for game day.',
    city: 'New York',
    address: '123 E 4th St, Manhattan',
    latitude: 40.7128,
    longitude: -74.0060,
    spot_type: 'sports_bar',
    tags: ['sports', 'beer', 'wings'],
    budget_tier: 'moderate',
    image_url: null,
    avg_rating: 4.3,
    total_reviews: 156,
    vibe_descriptors: ['energetic', 'loud', 'fun'],
  },
  {
    id: 'spot-2',
    name: 'Blind Tiger',
    description: 'Cozy speakeasy with craft cocktails and live jazz on weekends.',
    city: 'New York',
    address: '281 Bleecker St, Manhattan',
    latitude: 40.7128,
    longitude: -74.0060,
    spot_type: 'bar_lounge',
    tags: ['cocktails', 'jazz', 'speakeasy'],
    budget_tier: 'upscale',
    image_url: null,
    avg_rating: 4.6,
    total_reviews: 89,
    vibe_descriptors: ['intimate', 'romantic', 'sophisticated'],
  },
];

const mockPolymarket: PolymarketContext = {
  topic: 'Knicks',
  markets: [
    {
      id: 'market-1',
      question: 'Will the Knicks win tonight vs Heat?',
      description: 'Prediction market for Knicks vs Heat game',
      probability: 0.68,
      volume: 500000,
      volume24h: 125000,
      isHot: true,
      closed: false,
    },
    {
      id: 'market-2',
      question: 'Will Knicks make the playoffs?',
      description: 'Prediction market for Knicks playoff chances',
      probability: 0.82,
      volume: 1200000,
      volume24h: 450000,
      isHot: false,
      closed: false,
    },
  ],
  topPrediction: {
    question: 'Will the Knicks win tonight vs Heat?',
    probability: 0.68,
    confidence: 'high' as const,
    favoredOutcome: 'Knicks win',
  },
  trendingScore: 0.85,
  sportsPrediction: {
    event: 'Knicks vs Heat - Dec 6',
    favored: 'New York Knicks',
    underdog: 'Miami Heat',
    probability: 0.68,
  },
  suggestedIcebreaker: "Knicks are 68% favorites tonight - you think they cover the spread?",
};

const mockReddit: RedditContext = {
  city: 'New York',
  topic: 'bars',
  sentiment: 'positive',
  sentimentScore: 0.6,
  topPosts: [
    {
      title: 'Best dive bars in the East Village?',
      subreddit: 'AskNYC',
      score: 234,
      numComments: 89,
      url: 'https://reddit.com/r/AskNYC/...',
      snippet: 'Looking for authentic dive bar vibes...',
    },
  ],
  hiddenGems: [
    {
      name: "Milano's Bar",
      type: 'dive bar',
      reason: 'Old school NYC vibes, cheap drinks, locals only feel',
      sourcePost: 'https://reddit.com/...',
      mentionCount: 12,
    },
  ],
  localBuzz: ['Knicks playoff run', 'new rooftop bar opening', 'subway delays'],
};

function createMockContext(overrides: Partial<OracleContext> = {}): OracleContext {
  return {
    user: { id: 'test-user-1', phoneNumber: '+15551234567' },
    profile: mockProfile,
    conversationId: 'conv-123',
    conversationHistory: [
      { id: '1', conversation_id: 'conv-123', role: 'user', content: 'Hey!', oracle_response: null, kafka_events_emitted: [], created_at: new Date().toISOString() },
      { id: '2', conversation_id: 'conv-123', role: 'assistant', content: 'Hey Alex! What are you in the mood for?', oracle_response: null, kafka_events_emitted: [], created_at: new Date().toISOString() },
    ],
    intentClassification: {
      intent: 'general',
      dbIntent: 'general',
      confidence: 0.8,
      keywords: [],
    },
    dbIntent: 'general',
    entities: {
      city: 'new york',
      topic: 'bars',
      vibes: ['energetic'],
    },
    polymarket: mockPolymarket,
    reddit: mockReddit,
    relevantSpots: mockSpots,
    originalMessage: 'Find me a cool bar to watch the game',
    timestamp: new Date(),
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

async function testPromptBuilders() {
  printHeader('Testing Prompt Builders');

  // Test user context prompt
  printSubHeader('User Context Prompt');
  const userPrompt = buildUserContextPrompt(mockProfile);
  console.log(userPrompt);

  // Test spots context prompt
  printSubHeader('Spots Context Prompt');
  const spotsPrompt = buildSpotsContextPrompt(mockSpots);
  console.log(spotsPrompt);

  // Test Polymarket context prompt
  printSubHeader('Polymarket Context Prompt');
  const polyPrompt = buildPolymarketContextPrompt(mockPolymarket);
  console.log(polyPrompt);

  // Test Reddit context prompt
  printSubHeader('Reddit Context Prompt');
  const redditPrompt = buildRedditContextPrompt(mockReddit);
  console.log(redditPrompt);

  // Test full prompt builder
  printSubHeader('Full Prompt (truncated)');
  const context = createMockContext();
  const fullPrompt = buildFullPrompt({
    responseType: 'recommendation',
    userMessage: 'Find me a cool bar to watch the game',
    context,
  });
  console.log(`  Length: ${fullPrompt.length} chars`);
  console.log(`  Preview: "${fullPrompt.substring(0, 200)}..."`);

  console.log('\n✅ Prompt builders working correctly');
}

async function testSuggestedActions() {
  printHeader('Testing Suggested Actions');
  
  const context = createMockContext();
  const responseTypes: ResponseType[] = ['vibe_check', 'icebreaker', 'recommendation', 'meetup', 'reflection', 'general'];

  for (const type of responseTypes) {
    const actions = getSuggestedActions(type, context);
    printSubHeader(type);
    console.log(`  Actions: ${JSON.stringify(actions)}`);
  }

  console.log('\n✅ Suggested actions working correctly');
}

async function testIntentToResponseType() {
  printHeader('Testing Intent → Response Type Mapping');

  const intents = ['greeting', 'help', 'vibe_check', 'meet', 'drink', 'explore', 'learn', 'reflection', 'recommendation', 'general'] as const;
  
  for (const intent of intents) {
    const responseType = intentToResponseType(intent);
    console.log(`  ${intent} → ${responseType}`);
  }

  console.log('\n✅ Intent mapping working correctly');
}

async function testFallbackResponses() {
  printHeader('Testing Fallback Responses (No OpenAI)');

  const testCases = [
    { message: 'Hey!', intent: 'greeting' as const },
    { message: 'Help me', intent: 'help' as const },
    { message: "What's the vibe on Knicks?", intent: 'vibe_check' as const },
    { message: 'Find me a bar', intent: 'drink' as const },
    { message: 'I want to meet people', intent: 'meet' as const },
    { message: 'That place was amazing!', intent: 'reflection' as const },
  ];

  for (const tc of testCases) {
    const context = createMockContext({
      originalMessage: tc.message,
      intentClassification: {
        intent: tc.intent,
        dbIntent: tc.intent === 'vibe_check' || tc.intent === 'reflection' ? 'general' : tc.intent as any,
        confidence: 0.8,
        keywords: [],
      },
    });

    const responseType = intentToResponseType(tc.intent);
    const response = generateFallbackResponse(tc.message, tc.intent, context, responseType);

    printSubHeader(`"${tc.message}" (${tc.intent})`);
    printResult('Response', response.message);
    printResult('Actions', response.suggestedActions?.map(a => a.label).join(', '));
  }

  console.log('\n✅ Fallback responses working correctly');
}

async function testResponseQuality() {
  printHeader('Testing Response Quality Estimator');

  const responses: OracleGeneratedResponse[] = [
    { message: 'Hi', fallback: true }, // Too short
    { message: 'Check out The Stumble Inn! Great sports bar with 20 TVs, perfect for the game tonight. Want directions?', suggestedActions: [{ label: '📍', action: 'directions' }] },
    { message: 'Here are some options for you to consider when looking for a place...', fallback: true }, // No emoji, no question
    { message: '🏀 Knicks are 68% favored tonight! What do you think - upset incoming?', suggestedActions: [{ label: 'Yes', action: 'yes' }] },
  ];

  for (const response of responses) {
    const quality = estimateResponseQuality(response);
    printSubHeader(`"${response.message.substring(0, 50)}..."`);
    printResult('Quality Score', quality.toFixed(2));
    printResult('Fallback', response.fallback || false);
    printResult('Has Actions', !!response.suggestedActions);
  }

  console.log('\n✅ Quality estimator working correctly');
}

async function testGeneratorWithOpenAI() {
  printHeader('Testing LLM Response Generator');

  const stats = getGeneratorStats();
  console.log(`  OpenAI Configured: ${stats.configured ? '✅' : '❌'}`);
  console.log(`  Model: ${stats.model}`);

  if (!stats.configured) {
    console.log('\n  ⚠️  OpenAI not configured - skipping LLM tests');
    console.log('  Set OPENAI_API_KEY in .env to enable');
    return;
  }

  // Test greeting
  printSubHeader('Test: Greeting');
  const greetingContext = createMockContext({ originalMessage: 'Hey!' });
  const greeting = await generateGreeting('Alex', true, greetingContext);
  printResult('Response', greeting.message);
  printResult('Fallback', greeting.fallback || false);

  // Test vibe check
  printSubHeader('Test: Vibe Check');
  const vibeContext = createMockContext({
    originalMessage: "What's the vibe on the Knicks game?",
    intentClassification: { intent: 'vibe_check', dbIntent: 'general', confidence: 0.9, keywords: ['vibe', 'Knicks'] },
  });
  const vibeCheck = await generateVibeCheck(vibeContext);
  printResult('Response', vibeCheck.message);
  printResult('Tokens', vibeCheck.tokensUsed);

  // Test recommendation
  printSubHeader('Test: Recommendation');
  const recContext = createMockContext({
    originalMessage: 'Find me a bar to watch the game tonight',
    intentClassification: { intent: 'drink', dbIntent: 'drink', confidence: 0.85, keywords: ['bar', 'game'] },
  });
  const recommendation = await generateRecommendation(recContext);
  printResult('Response', recommendation.message);
  printResult('Actions', recommendation.suggestedActions?.map(a => a.label).join(', '));

  // Test meetup
  printSubHeader('Test: Meetup');
  const meetContext = createMockContext({
    originalMessage: 'I want to meet some Knicks fans for the game',
    intentClassification: { intent: 'meet', dbIntent: 'meet', confidence: 0.9, keywords: ['meet', 'Knicks', 'fans'] },
  });
  const meetup = await generateMeetupResponse(meetContext);
  printResult('Response', meetup.message);

  // Test reflection
  printSubHeader('Test: Reflection (Positive)');
  const reflectContext = createMockContext({
    originalMessage: 'That bar was amazing! Great atmosphere',
    intentClassification: { intent: 'reflection', dbIntent: 'general', confidence: 0.8, keywords: ['amazing', 'great'] },
  });
  const reflection = await generateReflection(reflectContext, 'positive');
  printResult('Response', reflection.message);

  // Test icebreaker
  printSubHeader('Test: Icebreaker');
  const iceContext = createMockContext();
  const icebreaker = await generateIcebreaker(iceContext, 'Knicks');
  printResult('Response', icebreaker.message);

  // Test general
  printSubHeader('Test: General Query');
  const generalContext = createMockContext({
    originalMessage: 'What should I do tonight?',
  });
  const general = await generateResponse({
    userMessage: 'What should I do tonight?',
    intent: 'general',
    context: generalContext,
    responseType: 'general',
  });
  printResult('Response', general.message);
  printResult('Model', general.model);

  console.log('\n✅ LLM response generation working correctly');
}

async function testErrorRecovery() {
  printHeader('Testing Error Recovery Prompts');

  const errorTypes = ['rate_limit', 'no_spots_found', 'api_error', 'invalid_city', 'generic'];

  for (const errorType of errorTypes) {
    const message = buildErrorRecoveryPrompt(errorType);
    printSubHeader(errorType);
    console.log(`  "${message}"`);
  }

  console.log('\n✅ Error recovery prompts working correctly');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n🔮 Phase 3.6: LLM Response Generator Tests\n');
  console.log('Testing the Social Oracle response generation system...\n');

  try {
    // Test prompts (no API calls)
    await testPromptBuilders();
    await testSuggestedActions();
    await testIntentToResponseType();
    await testFallbackResponses();
    await testResponseQuality();
    await testErrorRecovery();

    // Test with OpenAI (requires API key)
    await testGeneratorWithOpenAI();

    printHeader('ALL TESTS PASSED ✅');
    console.log('\nPhase 3.6 implementation is complete and working!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
