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
