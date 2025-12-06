/**
 * Oracle Module - Barrel Export
 */

// Main Agent
export { 
  OracleAgent, 
  createOracleAgent,
  type OracleResponse,
  type OracleAgentConfig,
} from './agent';

// Intent Classifier
export {
  classifyIntent,
  needsPolymarketContext,
  needsRedditContext,
  isRecommendationIntent,
  isConversationalIntent,
  detectSportsTeams,
  extractTopics,
  type ExtendedIntent,
  type IntentClassification,
} from './intentClassifier';

// Context Builder
export {
  buildContext,
  buildMinimalContext,
  buildEntities,
  extractCity,
  extractTimeframe,
  extractVenue,
  extractVibes,
  hasExternalData,
  getContextSummary,
  type OracleContext,
  type ExtractedEntities,
  type ContextBuilderOptions,
} from './contextBuilder';

// Response Generator (Phase 3.6)
export {
  generateResponse,
  generateGreeting,
  generateVibeCheck,
  generateIcebreaker,
  generateRecommendation,
  generateMeetupResponse,
  generateReflection,
  generateFallbackResponse,
  generateResponseVariants,
  isOpenAIConfigured,
  intentToResponseType,
  getGeneratorStats,
  estimateResponseQuality,
  type ResponseType,
  type GenerateResponseOptions,
  type OracleGeneratedResponse,
} from './responseGenerator';

// Prompts & Templates (Phase 3.6)
export {
  ORACLE_PERSONALITY,
  RESPONSE_TYPE_PROMPTS,
  buildFullPrompt,
  buildUserContextPrompt,
  buildSpotsContextPrompt,
  buildPolymarketContextPrompt,
  buildRedditContextPrompt,
  buildConversationHistoryPrompt,
  buildEntitiesPrompt,
  buildGreetingPrompt,
  buildRecommendationPrompt,
  buildErrorRecoveryPrompt,
  getSuggestedActions,
  type SuggestedAction,
  type PromptBuilderOptions,
} from './prompts';
