/**
 * Integrations Barrel Export
 * Central export point for all external integrations
 */

// Polymarket Integration
export {
  getPolymarketContext,
  getSportsEventPrediction,
  clearPolymarketCache,
  type PolymarketContext,
  type PolymarketMarket,
  type TopPrediction,
} from './polymarket';

// Reddit Integration (Live API)
export {
  getRedditContext,
  findHiddenGems,
  getLocalSentiment,
  getTrendingTopics,
  getSpotRedditData,
  batchGetSpotRedditData,
  getPersonalizedRecommendations,
  clearRedditCache,
  clearSpotCache,
  isCitySupported,
  getSupportedCities,
  getCitySubreddits,
  type RedditContext,
  type RedditPost,
  type SpotRedditData,
} from './reddit';
