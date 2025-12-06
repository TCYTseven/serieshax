/**
 * Polymarket MCP Integration
 * Wraps Polymarket MCP tools for prediction market context extraction
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PolymarketMarket {
  id: string;
  question: string;
  description: string;
  probability: number;      // 0-1, current YES price
  volume24h?: number;
  volume: number;
  isHot: boolean;           // High activity
  category?: string;
  endDate?: string;
  tokens?: string[];
  slug?: string;
  closed: boolean;
}

export interface TopPrediction {
  question: string;
  probability: number;
  confidence: 'low' | 'medium' | 'high';
  favoredOutcome?: string;  // For sports: who is favored to win
}

export interface PolymarketContext {
  topic: string;
  markets: PolymarketMarket[];
  topPrediction: TopPrediction | null;
  trendingScore: number;      // 0-100
  suggestedIcebreaker?: string;
  sportsPrediction?: {
    event: string;
    favored: string;
    probability: number;
    underdog: string;
  };
}

interface CacheEntry {
  context: PolymarketContext;
  timestamp: number;
}

// ============================================================================
// CACHE
// ============================================================================

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedContext(topic: string): PolymarketContext | null {
  const normalizedTopic = topic.toLowerCase().trim();
  const entry = cache.get(normalizedTopic);
  
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(normalizedTopic);
    return null;
  }
  
  return entry.context;
}

function setCachedContext(topic: string, context: PolymarketContext): void {
  const normalizedTopic = topic.toLowerCase().trim();
  cache.set(normalizedTopic, {
    context,
    timestamp: Date.now(),
  });
}

// ============================================================================
// MCP TOOL WRAPPERS
// ============================================================================

/**
 * These functions simulate what would happen when calling the MCP tools.
 * In production, these would be replaced with actual MCP tool calls.
 * For now, we'll create a mock implementation that can be swapped out.
 */

interface RawMarketData {
  condition_id: string;
  description: string;
  tokens: string;
  slug: string;
  volume: string;
  closed: boolean;
  end_date?: string;
  category?: string;
}

// Mock data store - in production this would call actual MCP tools
let marketDataStore: RawMarketData[] = [];

/**
 * Fetch markets from Polymarket MCP
 * This simulates the list-markets MCP tool
 */
export async function fetchMarkets(options?: {
  status?: 'active' | 'resolved';
  limit?: number;
  offset?: number;
}): Promise<RawMarketData[]> {
  // In production, this would call the MCP tool
  // For now, return mock data that represents typical Polymarket markets
  
  const mockMarkets: RawMarketData[] = [
    // Sports markets
    {
      condition_id: 'knicks-playoffs-2025',
      description: 'Will the New York Knicks make the 2025 NBA Playoffs? This market resolves to "Yes" if the Knicks qualify for the playoffs.',
      tokens: 'NBA: Knicks Playoffs 2025',
      slug: 'knicks-playoffs-2025',
      volume: '$125,000',
      closed: false,
      category: 'Sports'
    },
    {
      condition_id: 'knicks-vs-celtics-dec-2025',
      description: 'In the upcoming NBA game: If the New York Knicks win, the market resolves to "Knicks". If the Boston Celtics win, the market resolves to "Celtics".',
      tokens: 'NBA: New York Knicks vs. Boston Celtics',
      slug: 'nba-knicks-celtics-2025',
      volume: '$45,000',
      closed: false,
      category: 'Sports'
    },
    {
      condition_id: 'lakers-playoffs-2025',
      description: 'Will the Los Angeles Lakers make the 2025 NBA Playoffs?',
      tokens: 'NBA: Lakers Playoffs 2025',
      slug: 'lakers-playoffs-2025',
      volume: '$89,000',
      closed: false,
      category: 'Sports'
    },
    {
      condition_id: 'superbowl-2025-chiefs',
      description: 'Will the Kansas City Chiefs win Super Bowl 2025?',
      tokens: 'NFL: Chiefs Super Bowl 2025',
      slug: 'chiefs-superbowl-2025',
      volume: '$500,000',
      closed: false,
      category: 'Sports'
    },
    // Crypto markets
    {
      condition_id: 'btc-100k-2025',
      description: 'Will Bitcoin reach $100,000 by end of 2025?',
      tokens: 'Bitcoin $100K 2025',
      slug: 'btc-100k-2025',
      volume: '$2,500,000',
      closed: false,
      category: 'Crypto'
    },
    {
      condition_id: 'eth-10k-2025',
      description: 'Will Ethereum reach $10,000 by end of 2025?',
      tokens: 'Ethereum $10K 2025',
      slug: 'eth-10k-2025',
      volume: '$1,200,000',
      closed: false,
      category: 'Crypto'
    },
    // Politics
    {
      condition_id: 'trump-2028',
      description: 'Will Donald Trump run for president in 2028?',
      tokens: 'Trump 2028 Run',
      slug: 'trump-2028-run',
      volume: '$800,000',
      closed: false,
      category: 'Politics'
    },
    // Entertainment
    {
      condition_id: 'oscars-best-picture-2025',
      description: 'Will "Oppenheimer" win Best Picture at the 2025 Oscars?',
      tokens: 'Oscars Best Picture 2025',
      slug: 'oscars-best-picture-2025',
      volume: '$150,000',
      closed: false,
      category: 'Entertainment'
    },
  ];

  marketDataStore = mockMarkets;
  
  const limit = options?.limit || 10;
  const offset = options?.offset || 0;
  
  let filtered = mockMarkets;
  if (options?.status === 'active') {
    filtered = mockMarkets.filter(m => !m.closed);
  } else if (options?.status === 'resolved') {
    filtered = mockMarkets.filter(m => m.closed);
  }
  
  return filtered.slice(offset, offset + limit);
}

/**
 * Get market prices
 * Returns mock probability data
 */
export async function getMarketPrices(marketId: string): Promise<{
  probability: number;
  volume24h?: number;
} | null> {
  // Mock probability data based on market ID
  const mockPrices: Record<string, { probability: number; volume24h: number }> = {
    'knicks-playoffs-2025': { probability: 0.72, volume24h: 15000 },
    'knicks-vs-celtics-dec-2025': { probability: 0.45, volume24h: 8000 },
    'lakers-playoffs-2025': { probability: 0.65, volume24h: 12000 },
    'superbowl-2025-chiefs': { probability: 0.28, volume24h: 50000 },
    'btc-100k-2025': { probability: 0.58, volume24h: 250000 },
    'eth-10k-2025': { probability: 0.35, volume24h: 80000 },
    'trump-2028': { probability: 0.42, volume24h: 45000 },
    'oscars-best-picture-2025': { probability: 0.15, volume24h: 10000 },
  };
  
  return mockPrices[marketId] || null;
}

/**
 * Get market history
 */
export async function getMarketHistory(
  marketId: string,
  timeframe: '1d' | '7d' | '30d' | 'all' = '7d'
): Promise<{ priceChange: number; volumeChange: number } | null> {
  // Mock history - shows trend
  const mockHistory: Record<string, { priceChange: number; volumeChange: number }> = {
    'knicks-playoffs-2025': { priceChange: 0.05, volumeChange: 0.15 },
    'btc-100k-2025': { priceChange: 0.12, volumeChange: 0.35 },
    'superbowl-2025-chiefs': { priceChange: -0.08, volumeChange: 0.20 },
  };
  
  return mockHistory[marketId] || { priceChange: 0, volumeChange: 0 };
}

// ============================================================================
// CONTEXT EXTRACTION LOGIC
// ============================================================================

/**
 * Parse volume string to number
 */
function parseVolume(volumeStr: string): number {
  const cleaned = volumeStr.replace(/[$,]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Check if a market is relevant to a topic
 */
function isMarketRelevant(market: RawMarketData, topic: string): boolean {
  const topicLower = topic.toLowerCase();
  const searchFields = [
    market.description,
    market.tokens,
    market.slug,
    market.category || '',
  ].map(s => s.toLowerCase());
  
  // Check for direct matches
  if (searchFields.some(field => field.includes(topicLower))) {
    return true;
  }
  
  // Check for common aliases
  const aliases: Record<string, string[]> = {
    'knicks': ['new york knicks', 'nyk', 'knicks'],
    'lakers': ['los angeles lakers', 'la lakers', 'lal'],
    'celtics': ['boston celtics', 'bos'],
    'bitcoin': ['btc', 'bitcoin'],
    'ethereum': ['eth', 'ethereum'],
    'trump': ['donald trump', 'trump'],
  };
  
  const topicAliases = aliases[topicLower] || [topicLower];
  return searchFields.some(field => 
    topicAliases.some(alias => field.includes(alias))
  );
}

/**
 * Calculate if a market is "hot" based on volume and activity
 */
function isMarketHot(volume: number, volume24h?: number): boolean {
  // Market is hot if:
  // - Total volume > $50,000
  // - OR 24h volume > $10,000
  return volume > 50000 || (volume24h !== undefined && volume24h > 10000);
}

/**
 * Calculate trending score (0-100)
 */
function calculateTrendingScore(markets: PolymarketMarket[]): number {
  if (markets.length === 0) return 0;
  
  let score = 0;
  
  // Factor 1: Number of relevant markets (max 30 points)
  score += Math.min(markets.length * 10, 30);
  
  // Factor 2: Contested markets (probability 40-60%) are interesting (max 30 points)
  const contestedMarkets = markets.filter(m => m.probability >= 0.4 && m.probability <= 0.6);
  score += Math.min(contestedMarkets.length * 15, 30);
  
  // Factor 3: Hot markets (max 25 points)
  const hotMarkets = markets.filter(m => m.isHot);
  score += Math.min(hotMarkets.length * 12, 25);
  
  // Factor 4: Total volume (max 15 points)
  const totalVolume = markets.reduce((sum, m) => sum + m.volume, 0);
  if (totalVolume > 1000000) score += 15;
  else if (totalVolume > 500000) score += 10;
  else if (totalVolume > 100000) score += 5;
  
  return Math.min(score, 100);
}

/**
 * Determine confidence level based on probability
 */
function getConfidenceLevel(probability: number): 'low' | 'medium' | 'high' {
  // Strong predictions (far from 50%) have higher confidence
  const distanceFrom50 = Math.abs(probability - 0.5);
  if (distanceFrom50 > 0.3) return 'high';      // > 80% or < 20%
  if (distanceFrom50 > 0.15) return 'medium';   // > 65% or < 35%
  return 'low';                                  // 35-65%
}

/**
 * Extract sports prediction from market description
 */
function extractSportsPrediction(market: PolymarketMarket): {
  event: string;
  favored: string;
  probability: number;
  underdog: string;
} | null {
  // Use question for matching, not tokens array
  const questionText = market.question;
  
  // Check if it's a vs. match
  const vsMatch = questionText.match(/(.+)\s+vs\.?\s+(.+)/i);
  if (vsMatch) {
    const team1 = vsMatch[1].trim();
    const team2 = vsMatch[2].trim();
    
    // Probability > 0.5 means team1 is favored (assuming YES = team1 wins)
    const favored = market.probability > 0.5 ? team1 : team2;
    const underdog = market.probability > 0.5 ? team2 : team1;
    const favoredProb = market.probability > 0.5 ? market.probability : (1 - market.probability);
    
    return {
      event: questionText,
      favored,
      probability: favoredProb,
      underdog,
    };
  }
  
  return null;
}

/**
 * Generate icebreaker suggestion
 */
function generateIcebreaker(
  topic: string,
  topPrediction: TopPrediction | null,
  sportsPrediction?: { favored: string; probability: number; underdog: string; event: string }
): string | undefined {
  if (sportsPrediction) {
    const pct = Math.round(sportsPrediction.probability * 100);
    return `Polymarket has ${sportsPrediction.favored} at ${pct}% to beat ${sportsPrediction.underdog} - you think they cover?`;
  }
  
  if (!topPrediction) return undefined;
  
  const pct = Math.round(topPrediction.probability * 100);
  
  if (topPrediction.probability > 0.7) {
    return `Polymarket is ${pct}% sure on "${topPrediction.question}" - seems like easy money or trap?`;
  } else if (topPrediction.probability < 0.3) {
    return `Only ${pct}% think "${topPrediction.question}" will happen - contrarian bet?`;
  } else {
    return `"${topPrediction.question}" is at ${pct}% on Polymarket - pretty contested. What's your take?`;
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Get Polymarket context for a topic
 */
export async function getPolymarketContext(
  topic: string,
  options?: {
    limit?: number;
    includeHistory?: boolean;
  }
): Promise<PolymarketContext> {
  // Check cache first
  const cached = getCachedContext(topic);
  if (cached) {
    console.log(`📊 Polymarket: Using cached context for "${topic}"`);
    return cached;
  }
  
  console.log(`📊 Polymarket: Fetching context for "${topic}"`);
  
  const limit = options?.limit || 10;
  
  try {
    // Fetch all active markets
    const rawMarkets = await fetchMarkets({ status: 'active', limit: 50 });
    
    // Filter for relevant markets
    const relevantMarkets = rawMarkets.filter(m => isMarketRelevant(m, topic));
    
    // Enrich with price data
    const markets: PolymarketMarket[] = await Promise.all(
      relevantMarkets.slice(0, limit).map(async (raw) => {
        const prices = await getMarketPrices(raw.condition_id);
        const volume = parseVolume(raw.volume);
        
        return {
          id: raw.condition_id,
          question: raw.tokens,
          description: raw.description,
          probability: prices?.probability || 0.5,
          volume24h: prices?.volume24h,
          volume,
          isHot: isMarketHot(volume, prices?.volume24h),
          category: raw.category,
          endDate: raw.end_date,
          tokens: raw.tokens ? raw.tokens.split(',').map(t => t.trim()) : [],
          slug: raw.slug,
          closed: raw.closed,
        };
      })
    );
    
    // Sort by relevance (hot markets first, then by volume)
    markets.sort((a, b) => {
      if (a.isHot && !b.isHot) return -1;
      if (!a.isHot && b.isHot) return 1;
      return b.volume - a.volume;
    });
    
    // Get top prediction
    let topPrediction: TopPrediction | null = null;
    let sportsPrediction: PolymarketContext['sportsPrediction'] = undefined;
    
    if (markets.length > 0) {
      const topMarket = markets[0];
      topPrediction = {
        question: topMarket.question,
        probability: topMarket.probability,
        confidence: getConfidenceLevel(topMarket.probability),
      };
      
      // Extract sports prediction if applicable
      const extracted = extractSportsPrediction(topMarket);
      if (extracted) {
        sportsPrediction = extracted;
        topPrediction.favoredOutcome = extracted.favored;
      }
    }
    
    // Calculate trending score
    const trendingScore = calculateTrendingScore(markets);
    
    // Generate icebreaker
    const suggestedIcebreaker = generateIcebreaker(topic, topPrediction, sportsPrediction);
    
    const context: PolymarketContext = {
      topic,
      markets,
      topPrediction,
      trendingScore,
      suggestedIcebreaker,
      sportsPrediction,
    };
    
    // Cache the result
    setCachedContext(topic, context);
    
    console.log(`📊 Polymarket: Found ${markets.length} markets for "${topic}", trending score: ${trendingScore}`);
    
    return context;
    
  } catch (error) {
    console.error(`📊 Polymarket: Error fetching context for "${topic}":`, error);
    
    // Return empty context on error
    return {
      topic,
      markets: [],
      topPrediction: null,
      trendingScore: 0,
    };
  }
}

/**
 * Get sports event predictions
 * Specialized function for sports-related queries
 */
export async function getSportsEventPrediction(
  team1: string,
  team2?: string
): Promise<{
  event: string;
  favored: string;
  probability: number;
  underdog: string;
  icebreaker: string;
} | null> {
  const context = await getPolymarketContext(team1);
  
  // If team2 is specified, look for head-to-head market
  if (team2) {
    const h2hMarket = context.markets.find(m => 
      m.description.toLowerCase().includes(team2.toLowerCase())
    );
    
    if (h2hMarket) {
      const prediction = extractSportsPrediction(h2hMarket);
      if (prediction) {
        return {
          ...prediction,
          icebreaker: `Polymarket has ${prediction.favored} at ${Math.round(prediction.probability * 100)}% vs ${prediction.underdog}. Agree?`,
        };
      }
    }
  }
  
  // Return the sports prediction from context if available
  if (context.sportsPrediction) {
    return {
      ...context.sportsPrediction,
      icebreaker: context.suggestedIcebreaker || '',
    };
  }
  
  return null;
}

/**
 * Clear the cache (for testing)
 */
export function clearPolymarketCache(): void {
  cache.clear();
  console.log('📊 Polymarket: Cache cleared');
}
