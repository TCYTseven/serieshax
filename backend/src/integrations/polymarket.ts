/**
 * Polymarket Integration - REAL API
 * Fetches live prediction market data from Polymarket's public API
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PolymarketMarket {
  id: string;
  question: string;
  description: string;
  probability: number;      // 0-1, current YES price
  volume: number;
  volume24h?: number;
  isHot: boolean;
  category?: string;
  endDate?: string;
  slug?: string;
  closed: boolean;
}

export interface TopPrediction {
  question: string;
  probability: number;
  confidence: 'low' | 'medium' | 'high';
  favoredOutcome?: string;
}

export interface PolymarketContext {
  topic: string;
  markets: PolymarketMarket[];
  topPrediction: TopPrediction | null;
  trendingScore: number;
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

// Raw API response types
interface PolymarketAPIMarket {
  condition_id: string;
  question_id?: string;
  question: string;
  description?: string;
  market_slug?: string;
  end_date_iso?: string;
  game_start_time?: string;
  tokens?: Array<{
    token_id: string;
    outcome: string;
    price?: number;
  }>;
  outcomePrices?: string;  // JSON string like "[0.65, 0.35]"
  volume?: number;
  volume_num?: number;
  liquidity?: number;
  active?: boolean;
  closed?: boolean;
  accepting_orders?: boolean;
}

// ============================================================================
// CONFIG
// ============================================================================

const POLYMARKET_API_BASE = 'https://gamma-api.polymarket.com';
const CLOB_API_BASE = 'https://clob.polymarket.com';

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
// API FUNCTIONS
// ============================================================================

/**
 * Fetch markets from Polymarket Gamma API
 */
async function fetchMarketsFromAPI(searchTerm?: string): Promise<PolymarketAPIMarket[]> {
  try {
    // Try the events endpoint which has better data - fetch more for better coverage
    let url = `${POLYMARKET_API_BASE}/events?closed=false&limit=200`;
    
    console.log(`📊 Polymarket API: Fetching from ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.log(`📊 Polymarket API: Events endpoint failed (${response.status}), trying markets endpoint`);
      // Fallback to markets endpoint
      url = `${POLYMARKET_API_BASE}/markets?closed=false&limit=100`;
      const fallbackResponse = await fetch(url);
      if (!fallbackResponse.ok) {
        throw new Error(`API returned ${fallbackResponse.status}`);
      }
      const data = await fallbackResponse.json();
      return Array.isArray(data) ? data : [];
    }
    
    const events = await response.json();
    
    // Events contain nested markets
    const markets: PolymarketAPIMarket[] = [];
    if (Array.isArray(events)) {
      for (const event of events) {
        if (event.markets && Array.isArray(event.markets)) {
          markets.push(...event.markets);
        } else {
          // Event itself might be a market
          markets.push(event);
        }
      }
    }
    
    return markets;
  } catch (error) {
    console.error('📊 Polymarket API error:', error);
    return [];
  }
}

/**
 * Parse probability from market data
 */
function parseProbability(market: PolymarketAPIMarket): number {
  // Try outcomePrices first (JSON string like "[0.65, 0.35]")
  if (market.outcomePrices) {
    try {
      const prices = JSON.parse(market.outcomePrices);
      if (Array.isArray(prices) && prices.length > 0) {
        return parseFloat(prices[0]) || 0.5;
      }
    } catch {
      // Ignore parse errors
    }
  }
  
  // Try tokens array
  if (market.tokens && market.tokens.length > 0) {
    const yesToken = market.tokens.find(t => 
      t.outcome?.toLowerCase() === 'yes' || t.outcome?.toLowerCase().includes('yes')
    );
    if (yesToken?.price) {
      return yesToken.price;
    }
    // Just use first token price
    if (market.tokens[0]?.price) {
      return market.tokens[0].price;
    }
  }
  
  return 0.5; // Default to 50%
}

/**
 * Parse volume from market data
 */
function parseVolume(market: PolymarketAPIMarket): number {
  if (market.volume_num) return market.volume_num;
  if (market.volume) return market.volume;
  if (market.liquidity) return market.liquidity;
  return 0;
}

/**
 * Check if market is relevant to search topic
 */
function isMarketRelevant(market: PolymarketAPIMarket, topic: string): boolean {
  const topicLower = topic.toLowerCase();
  const searchFields = [
    market.question || '',
    market.description || '',
    market.market_slug || '',
  ].map(s => s.toLowerCase());
  
  // Direct match
  if (searchFields.some(field => field.includes(topicLower))) {
    return true;
  }
  
  // Common aliases for sports teams
  const aliases: Record<string, string[]> = {
    'knicks': ['new york knicks', 'nyk', 'knicks', 'ny knicks'],
    'lakers': ['los angeles lakers', 'la lakers', 'lakers', 'lal'],
    'celtics': ['boston celtics', 'celtics', 'bos'],
    'warriors': ['golden state warriors', 'warriors', 'gsw'],
    'nets': ['brooklyn nets', 'nets', 'bkn'],
    'heat': ['miami heat', 'heat', 'mia'],
    'bulls': ['chicago bulls', 'bulls', 'chi'],
    'mavericks': ['dallas mavericks', 'mavs', 'mavericks', 'dal'],
    'chiefs': ['kansas city chiefs', 'chiefs', 'kc'],
    'eagles': ['philadelphia eagles', 'eagles', 'philly'],
    'cowboys': ['dallas cowboys', 'cowboys'],
    'bitcoin': ['btc', 'bitcoin'],
    'ethereum': ['eth', 'ethereum'],
    'trump': ['donald trump', 'trump'],
  };
  
  const topicAliases = aliases[topicLower] || [topicLower];
  return searchFields.some(field => 
    topicAliases.some(alias => field.includes(alias))
  );
}

// ============================================================================
// CONTEXT EXTRACTION
// ============================================================================

/**
 * Calculate if market is "hot" based on volume
 */
function isMarketHot(volume: number): boolean {
  return volume > 50000;
}

/**
 * Calculate trending score (0-100)
 */
function calculateTrendingScore(markets: PolymarketMarket[]): number {
  if (markets.length === 0) return 0;
  
  let score = 0;
  
  // Factor 1: Number of relevant markets (max 30 points)
  score += Math.min(markets.length * 10, 30);
  
  // Factor 2: Contested markets 40-60% (max 30 points)
  const contested = markets.filter(m => m.probability >= 0.4 && m.probability <= 0.6);
  score += Math.min(contested.length * 15, 30);
  
  // Factor 3: Hot markets (max 25 points)
  const hot = markets.filter(m => m.isHot);
  score += Math.min(hot.length * 12, 25);
  
  // Factor 4: Total volume (max 15 points)
  const totalVolume = markets.reduce((sum, m) => sum + m.volume, 0);
  if (totalVolume > 1000000) score += 15;
  else if (totalVolume > 500000) score += 10;
  else if (totalVolume > 100000) score += 5;
  
  return Math.min(score, 100);
}

/**
 * Get confidence level from probability
 */
function getConfidenceLevel(probability: number): 'low' | 'medium' | 'high' {
  const distanceFrom50 = Math.abs(probability - 0.5);
  if (distanceFrom50 > 0.3) return 'high';
  if (distanceFrom50 > 0.15) return 'medium';
  return 'low';
}

/**
 * Extract sports prediction from market question
 */
function extractSportsPrediction(market: PolymarketMarket): {
  event: string;
  favored: string;
  probability: number;
  underdog: string;
} | null {
  const question = market.question;
  
  // Look for "vs" pattern
  const vsMatch = question.match(/(.+?)\s+vs\.?\s+(.+?)(?:\?|$|\()/i);
  if (vsMatch) {
    const team1 = vsMatch[1].trim().replace(/^Will\s+/i, '').replace(/^the\s+/i, '');
    const team2 = vsMatch[2].trim().replace(/\s+win.*$/i, '');
    
    const favored = market.probability > 0.5 ? team1 : team2;
    const underdog = market.probability > 0.5 ? team2 : team1;
    const favoredProb = market.probability > 0.5 ? market.probability : (1 - market.probability);
    
    return {
      event: question,
      favored,
      probability: favoredProb,
      underdog,
    };
  }
  
  return null;
}

/**
 * Generate natural icebreaker
 */
function generateIcebreaker(
  topic: string,
  topPrediction: TopPrediction | null,
  sportsPrediction?: { favored: string; probability: number; underdog: string; event: string }
): string | undefined {
  
  if (sportsPrediction) {
    const pct = Math.round(sportsPrediction.probability * 100);
    const favored = sportsPrediction.favored.split(' ').pop() || sportsPrediction.favored;
    const underdog = sportsPrediction.underdog.split(' ').pop() || sportsPrediction.underdog;
    
    const options = pct > 65 ? [
      `yo bettors have ${favored} at ${pct}% over ${underdog}... you buying that?`,
      `${pct}% on polymarket think ${favored} takes this. trap or lock?`,
      `markets heavy on ${favored} (${pct}%). what's your read?`,
    ] : pct >= 45 ? [
      `${favored} vs ${underdog} is basically a coin flip on polymarket. who you got?`,
      `markets split on this one - ${favored} slight edge at ${pct}%. thoughts?`,
    ] : [
      `${underdog} getting no love at ${100-pct}%... upset brewing?`,
      `markets sleeping on ${underdog}? only ${100-pct}% odds`,
    ];
    
    return options[Math.floor(Math.random() * options.length)];
  }
  
  if (!topPrediction) return undefined;
  
  const pct = Math.round(topPrediction.probability * 100);
  const topicLower = topic.toLowerCase();
  
  // Crypto - make it conversational based on the actual question
  if (topicLower.includes('bitcoin') || topicLower.includes('btc')) {
    const question = topPrediction.question.toLowerCase();
    
    // Dip markets
    if (question.includes('dip')) {
      const priceMatch = topPrediction.question.match(/\$[\d,]+/);
      const price = priceMatch ? priceMatch[0] : '';
      return pct > 50 
        ? `polymarket thinks there's a ${pct}% chance BTC dips to ${price}. you worried or buying the dip?`
        : `only ${pct}% think bitcoin drops to ${price}. seems like most people are bullish`;
    }
    
    // Price target markets  
    if (question.includes('reach')) {
      const priceMatch = topPrediction.question.match(/\$[\d,]+/);
      const price = priceMatch ? priceMatch[0] : '';
      return pct > 50
        ? `${pct}% chance BTC hits ${price} according to polymarket. you think it happens?`
        : `only ${pct}% give BTC a shot at ${price}. too bearish or realistic?`;
    }
    
    // Generic
    return pct > 50 
      ? `polymarket's ${pct}% on this bitcoin play. what's your take?`
      : `only ${pct}% on this one. contrarian opportunity?`;
  }
  
  if (topicLower.includes('eth')) {
    return `ETH prediction sitting at ${pct}% on polymarket. bullish or nah?`;
  }
  
  // Politics
  if (topicLower.includes('trump') || topicLower.includes('election')) {
    return `prediction markets have this at ${pct}%. wild times`;
  }
  
  // Generic
  return pct > 70 
    ? `bettors are ${pct}% confident on this. you agree?`
    : pct < 30
    ? `only ${pct}% give this a shot. they sleeping?`
    : `this one's at ${pct}% on polymarket - could go either way`;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Get Polymarket context for a topic - fetches REAL data from API
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
  
  console.log(`📊 Polymarket: Fetching LIVE data for "${topic}"`);
  
  const limit = options?.limit || 10;
  
  try {
    // Fetch real markets from API
    const rawMarkets = await fetchMarketsFromAPI(topic);
    console.log(`📊 Polymarket: Got ${rawMarkets.length} total markets from API`);
    
    // Filter for relevant markets
    const relevantMarkets = rawMarkets.filter(m => isMarketRelevant(m, topic));
    console.log(`📊 Polymarket: ${relevantMarkets.length} markets match "${topic}"`);
    
    // Transform ALL relevant markets first (before limiting)
    const allMarkets: PolymarketMarket[] = relevantMarkets.map(raw => {
      const probability = parseProbability(raw);
      const volume = parseVolume(raw);
      
      return {
        id: raw.condition_id || raw.question_id || '',
        question: raw.question || '',
        description: raw.description || '',
        probability,
        volume,
        isHot: isMarketHot(volume),
        category: undefined,
        endDate: raw.end_date_iso || raw.game_start_time,
        slug: raw.market_slug,
        closed: raw.closed || false,
      };
    });
    
    // Sort by "interestingness" - contested markets with HIGH volume are best
    allMarkets.sort((a, b) => {
      // Score based on how contested (closer to 50% = more interesting)
      // Range: 0.15-0.85 is interesting, 0.3-0.7 is very interesting
      const getContestedScore = (prob: number) => {
        if (prob < 0.1 || prob > 0.9) return 0; // Too extreme, not interesting
        if (prob >= 0.3 && prob <= 0.7) return 1; // Very contested
        return 0.5; // Somewhat contested
      };
      
      const contestedA = getContestedScore(a.probability);
      const contestedB = getContestedScore(b.probability);
      
      // Volume matters a lot - require minimum $10k to be interesting
      const getVolumeScore = (vol: number) => {
        if (vol < 10000) return 0;
        if (vol > 1000000) return 1;
        return vol / 1000000;
      };
      
      const volumeA = getVolumeScore(a.volume);
      const volumeB = getVolumeScore(b.volume);
      
      // Combined score: must have BOTH contestedness and volume
      // Multiply them so 0 in either = 0 total
      const scoreA = contestedA * (0.3 + volumeA * 0.7);
      const scoreB = contestedB * (0.3 + volumeB * 0.7);
      
      return scoreB - scoreA;
    });
    
    // Find most interesting market BEFORE slicing (contested with significant volume)
    const bestMarket = allMarkets.find(m => 
      m.probability >= 0.2 && m.probability <= 0.8 && m.volume > 50000
    ) || allMarkets.find(m => 
      m.probability >= 0.1 && m.probability <= 0.9 && m.volume > 10000
    ) || allMarkets[0];
    
    // Now slice to limit for return
    const markets = allMarkets.slice(0, limit);
    
    // Extract predictions
    let topPrediction: TopPrediction | null = null;
    let sportsPrediction: PolymarketContext['sportsPrediction'] = undefined;
    
    if (bestMarket) {
      topPrediction = {
        question: bestMarket.question,
        probability: bestMarket.probability,
        confidence: getConfidenceLevel(bestMarket.probability),
      };
      
      const extracted = extractSportsPrediction(bestMarket);
      if (extracted) {
        sportsPrediction = extracted;
        topPrediction.favoredOutcome = extracted.favored;
      }
    }
    
    const trendingScore = calculateTrendingScore(markets);
    const suggestedIcebreaker = generateIcebreaker(topic, topPrediction, sportsPrediction);
    
    const context: PolymarketContext = {
      topic,
      markets,
      topPrediction,
      trendingScore,
      suggestedIcebreaker,
      sportsPrediction,
    };
    
    // Cache result
    setCachedContext(topic, context);
    
    console.log(`📊 Polymarket: Found ${markets.length} markets, trending: ${trendingScore}`);
    
    return context;
    
  } catch (error) {
    console.error(`📊 Polymarket: Error fetching context for "${topic}":`, error);
    
    return {
      topic,
      markets: [],
      topPrediction: null,
      trendingScore: 0,
    };
  }
}

/**
 * Get sports prediction for specific matchup
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
  
  if (team2) {
    const h2hMarket = context.markets.find(m => 
      m.question.toLowerCase().includes(team2.toLowerCase())
    );
    
    if (h2hMarket) {
      const prediction = extractSportsPrediction(h2hMarket);
      if (prediction) {
        const pct = Math.round(prediction.probability * 100);
        const icebreaker = `${prediction.favored} vs ${prediction.underdog} - markets have it at ${pct}%. who you got?`;
        return { ...prediction, icebreaker };
      }
    }
  }
  
  if (context.sportsPrediction) {
    return {
      ...context.sportsPrediction,
      icebreaker: context.suggestedIcebreaker || '',
    };
  }
  
  return null;
}

/**
 * Clear cache
 */
export function clearPolymarketCache(): void {
  cache.clear();
  console.log('📊 Polymarket: Cache cleared');
}
