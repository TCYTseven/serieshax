/**
 * Services Barrel Export
 * Central export point for all Supabase services
 */

// User Service
export * from './userService';

// Conversation Service
export * from './conversationService';

// Spot Service
export * from './spotService';

// Meetup Service
export * from './meetupService';

// Opinion Service
export * from './opinionService';

// Vibe Service
export * from './vibeService';

// Oracle Service (AI)
export * from './oracleService';

// Re-export Polymarket integration
export { 
  getPolymarketContext, 
  getSportsEventPrediction,
  type PolymarketContext 
} from '../integrations/polymarket';

// Re-export Reddit integration (Live API)
export {
  getRedditContext,
  findHiddenGems,
  getLocalSentiment,
  getTrendingTopics,
  getSpotRedditData,
  batchGetSpotRedditData,
  getPersonalizedRecommendations,
  clearRedditCache,
  isCitySupported,
  getSupportedCities,
  type RedditContext,
  type SpotRedditData,
} from '../integrations/reddit';

// Rate Limiter
export * from './rateLimiter';

// Event Creation Agent
export {
  createPersonalizedEvents,
  analyzeUserProfile,
  fetchPolymarketData,
  fetchRedditData,
  generateEventSuggestions,
  saveEventsToSupabase,
  type OnboardingProfile,
  type SearchFilters,
  type GeneratedEvent,
  type EventCreationResult,
  type PersonalityAnalysis,
  type PolymarketNote,
  type RedditNote,
} from './eventCreationAgent';

// Re-export types for convenience
export type {
  User,
  Profile,
  UserWithProfile,
  UpdateProfileInput,
  Conversation,
  ConversationMessage,
  ConversationWithMessages,
  CreateMessageInput,
  SeriesSpot,
  SpotFilters,
  Meetup,
  MeetupParticipant,
  MeetupWithDetails,
  CreateMeetupInput,
  MicroOpinion,
  CreateOpinionInput,
  CityVibe,
  HangoutReview,
  UserIntent,
  VibeTag,
  MeetupStatus,
  SpotType,
  SentimentType,
  BudgetTier,
  SocialAnxietyLevel,
} from '../types/database';
