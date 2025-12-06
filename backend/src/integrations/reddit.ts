/**
 * Reddit Integration - Live API
 * Extracts local sentiment, hidden gems, and trending topics from city subreddits
 * Uses Reddit's public JSON API for real-time data fetching
 */

// ============================================================================
// TYPES
// ============================================================================

export interface RedditContext {
  city: string;
  topic?: string;
  sentiment: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  sentimentScore: number; // -1 to 1
  topPosts: Array<{
    title: string;
    subreddit: string;
    score: number;
    numComments: number;
    url: string;
    snippet?: string; // Brief excerpt from post
  }>;
  hiddenGems: Array<{
    name: string;
    type: string; // "bar", "restaurant", etc.
    reason: string; // Why it's recommended
    sourcePost: string; // Reddit URL
    mentionCount?: number; // How many times mentioned
  }>;
  localBuzz: string[]; // Current hot topics in the city
  summary?: string; // AI-generated or extracted summary
}

export interface RedditPost {
  id: string;
  title: string;
  selftext?: string;
  subreddit: string;
  score: number;
  num_comments: number;
  url: string;
  permalink: string;
  created_utc: number;
}

export interface SpotRedditData {
  spotName: string;
  sentiment: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  sentimentScore: number;
  mentionCount: number;
  summary: string; // 1-2 sentence summary
  recentMentions: Array<{
    title: string;
    snippet: string;
    score: number;
    url: string;
    date: Date;
  }>;
  recommendations: string[]; // What people say about it
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// ============================================================================
// CITY SUBREDDIT MAPPING
// ============================================================================

const CITY_SUBREDDITS: Record<string, string[]> = {
  // New York
  'new york': ['nyc', 'newyorkcity', 'brooklyn', 'manhattan'],
  'nyc': ['nyc', 'newyorkcity'],
  'brooklyn': ['brooklyn', 'nyc'],
  'manhattan': ['manhattan', 'nyc'],
  
  // California
  'los angeles': ['losangeles', 'LosAngeles'],
  'la': ['losangeles', 'LosAngeles'],
  'san francisco': ['sanfrancisco', 'bayarea'],
  'sf': ['sanfrancisco', 'bayarea'],
  'bay area': ['bayarea', 'sanfrancisco'],
  'san diego': ['sandiego'],
  'oakland': ['oakland', 'bayarea'],
  
  // Major US Cities
  'chicago': ['chicago'],
  'miami': ['miami'],
  'austin': ['austin', 'Austin'],
  'seattle': ['seattle', 'SeattleWA'],
  'boston': ['boston'],
  'denver': ['denver', 'Denver'],
  'portland': ['portland', 'Portland'],
  'philadelphia': ['philadelphia'],
  'philly': ['philadelphia'],
  'atlanta': ['atlanta'],
  'nashville': ['nashville'],
  'las vegas': ['vegas', 'lasvegas'],
  'vegas': ['vegas', 'lasvegas'],
  'washington dc': ['washingtondc', 'WashingtonDC'],
  'dc': ['washingtondc', 'WashingtonDC'],
  'new orleans': ['neworleans'],
  'minneapolis': ['minneapolis', 'twincities'],
  'detroit': ['detroit'],
  'houston': ['houston'],
  'dallas': ['dallas'],
  'phoenix': ['phoenix'],
  'salt lake city': ['saltlakecity'],
  'pittsburgh': ['pittsburgh'],
  'cleveland': ['cleveland'],
  'charlotte': ['charlotte'],
  'tampa': ['tampa'],
  'san antonio': ['sanantonio'],
  'cincinnati': ['cincinnati'],
  'kansas city': ['kansascity'],
  'orlando': ['orlando'],
  'indianapolis': ['indianapolis'],
  'columbus': ['columbus'],
  'milwaukee': ['milwaukee'],
  'raleigh': ['raleigh'],
  'baltimore': ['baltimore'],
};

// ============================================================================
// SENTIMENT ANALYSIS
// ============================================================================

const POSITIVE_KEYWORDS = [
  'love', 'amazing', 'best', 'recommend', 'great', 'awesome', 'fantastic',
  'excellent', 'incredible', 'wonderful', 'perfect', 'favorite', 'gem',
  'underrated', 'must-visit', 'must visit', 'hidden', 'authentic', 'delicious',
  'friendly', 'cozy', 'beautiful', 'stunning', 'worth', 'definitely', 'highly',
  'outstanding', 'phenomenal', 'superb', 'top-notch', 'legit', 'fire', 'slaps'
];

const NEGATIVE_KEYWORDS = [
  'avoid', 'worst', 'terrible', 'overrated', 'hate', 'awful', 'horrible',
  'disappointing', 'mediocre', 'meh', 'skip', 'overpriced', 'rude', 'dirty',
  'bad', 'waste', 'never again', 'trash', 'scam', 'tourist trap', 'closed',
  'shutdown', 'closing', 'crime', 'dangerous', 'sketchy', 'gross', 'nasty'
];

const STRONG_POSITIVE_KEYWORDS = [
  'absolutely love', 'best ever', 'life changing', 'blown away', 'obsessed',
  'cannot recommend enough', 'hands down best', '10/10', 'insanely good'
];

const STRONG_NEGATIVE_KEYWORDS = [
  'absolutely terrible', 'worst ever', 'stay away', 'total scam', 'nightmare',
  'food poisoning', 'got robbed', 'never go', '0/10'
];

/**
 * Calculate sentiment score from text (-1 to 1)
 */
function calculateSentiment(text: string): number {
  const textLower = text.toLowerCase();
  let score = 0;
  let count = 0;

  // Check strong keywords first (weight: 2x)
  for (const keyword of STRONG_POSITIVE_KEYWORDS) {
    if (textLower.includes(keyword)) {
      score += 2;
      count += 2;
    }
  }
  for (const keyword of STRONG_NEGATIVE_KEYWORDS) {
    if (textLower.includes(keyword)) {
      score -= 2;
      count += 2;
    }
  }

  // Check regular keywords (weight: 1x)
  for (const keyword of POSITIVE_KEYWORDS) {
    if (textLower.includes(keyword)) {
      score += 1;
      count += 1;
    }
  }
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (textLower.includes(keyword)) {
      score -= 1;
      count += 1;
    }
  }

  // Normalize to -1 to 1 range
  if (count === 0) return 0;
  const rawScore = score / count;
  return Math.max(-1, Math.min(1, rawScore));
}

/**
 * Get sentiment label from score
 */
function getSentimentLabel(score: number): RedditContext['sentiment'] {
  if (score >= 0.6) return 'very_positive';
  if (score >= 0.2) return 'positive';
  if (score > -0.2) return 'neutral';
  if (score > -0.6) return 'negative';
  return 'very_negative';
}

/**
 * Aggregate sentiment from multiple posts
 */
function aggregateSentiment(posts: Array<{ title: string; selftext?: string; score: number }>): {
  sentiment: RedditContext['sentiment'];
  sentimentScore: number;
} {
  if (posts.length === 0) {
    return { sentiment: 'neutral', sentimentScore: 0 };
  }

  // Weight sentiment by post score (upvotes)
  let totalWeight = 0;
  let weightedScore = 0;

  for (const post of posts) {
    const text = `${post.title} ${post.selftext || ''}`;
    const sentiment = calculateSentiment(text);
    const weight = Math.max(1, Math.log10(post.score + 1)); // Log scale for score
    
    weightedScore += sentiment * weight;
    totalWeight += weight;
  }

  const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
  return {
    sentiment: getSentimentLabel(finalScore),
    sentimentScore: Math.round(finalScore * 100) / 100,
  };
}

// ============================================================================
// HIDDEN GEM EXTRACTION
// ============================================================================

const GEM_SEARCH_TERMS = [
  'hidden gem', 'underrated', 'locals only', 'secret spot', 'local favorite',
  'off the beaten path', 'not touristy', 'best kept secret', 'hole in the wall',
  'authentic', 'neighborhood spot', 'go-to', 'sleeper hit'
];

const PLACE_TYPES = [
  { keywords: ['bar', 'cocktail', 'drinks', 'pub', 'brewery', 'speakeasy'], type: 'bar' },
  { keywords: ['restaurant', 'food', 'eat', 'dining', 'eatery', 'bistro', 'cafe'], type: 'restaurant' },
  { keywords: ['coffee', 'cafe', 'espresso', 'latte'], type: 'coffee shop' },
  { keywords: ['pizza', 'pizzeria', 'slice'], type: 'pizza place' },
  { keywords: ['taco', 'mexican', 'burrito'], type: 'mexican restaurant' },
  { keywords: ['ramen', 'noodle', 'pho', 'asian'], type: 'asian restaurant' },
  { keywords: ['brunch', 'breakfast'], type: 'brunch spot' },
  { keywords: ['park', 'garden', 'outdoor'], type: 'outdoor spot' },
  { keywords: ['club', 'nightclub', 'dancing'], type: 'nightclub' },
  { keywords: ['rooftop'], type: 'rooftop bar' },
  { keywords: ['wine bar', 'wine'], type: 'wine bar' },
  { keywords: ['sports bar', 'game', 'watch'], type: 'sports bar' },
  { keywords: ['dive bar', 'dive'], type: 'dive bar' },
  { keywords: ['bookstore', 'book'], type: 'bookstore' },
  { keywords: ['museum', 'gallery', 'art'], type: 'cultural spot' },
  { keywords: ['gym', 'workout', 'fitness'], type: 'gym' },
  { keywords: ['spa', 'massage', 'wellness'], type: 'spa' },
];

/**
 * Detect place type from text
 */
function detectPlaceType(text: string): string {
  const textLower = text.toLowerCase();
  
  for (const placeType of PLACE_TYPES) {
    if (placeType.keywords.some(kw => textLower.includes(kw))) {
      return placeType.type;
    }
  }
  
  return 'spot'; // Generic fallback
}

/**
 * Extract potential place names from text
 * Uses capitalization patterns and common patterns
 */
function extractPlaceNames(text: string): string[] {
  const names: string[] = [];
  let match;
  
  // Pattern 1: Specific recommendation patterns
  // "Check out [Name]", "Try [Name]", "I recommend [Name]"
  const recommendPattern = /(?:check out|try|visit|go to|hit up|recommend|love|loving)\s+([A-Z][a-zA-Z0-9\s'&-]{2,25}?)(?:\s*[-–—]|\s+on\s|\s+in\s|\s+for\s|[.,!?]|$)/gi;
  while ((match = recommendPattern.exec(text)) !== null) {
    const name = cleanPlaceName(match[1]);
    if (isValidPlaceName(name)) {
      names.push(name);
    }
  }
  
  // Pattern 2: Quoted names (high confidence)
  const quotedPattern = /"([A-Za-z0-9\s'&-]{3,30})"/g;
  while ((match = quotedPattern.exec(text)) !== null) {
    const name = cleanPlaceName(match[1]);
    if (isValidPlaceName(name)) {
      names.push(name);
    }
  }
  
  // Pattern 3: "at [Name]" or "called [Name]" (with word boundary)
  const atPattern = /(?:at|called|named|love|loved)\s+([A-Z][a-zA-Z0-9\s'&-]{2,25}?)(?:\s+[-–—]|\s+and\s|\s+or\s|[.,!?]|$)/gi;
  while ((match = atPattern.exec(text)) !== null) {
    const name = cleanPlaceName(match[1]);
    if (isValidPlaceName(name)) {
      names.push(name);
    }
  }
  
  // Pattern 4: "[Name]'s" - possessive form often indicates place names
  const possessivePattern = /([A-Z][a-zA-Z0-9\s]{1,20})'s\s+(?:pizza|bar|restaurant|cafe|coffee|deli|bakery|kitchen|grill|tavern|pub|lounge)/gi;
  while ((match = possessivePattern.exec(text)) !== null) {
    const name = cleanPlaceName(match[1] + "'s");
    if (isValidPlaceName(name)) {
      names.push(name);
    }
  }
  
  // Dedupe and return
  const uniqueNames = [...new Set(names.map(n => n.toLowerCase()))];
  return uniqueNames.map(n => {
    // Return original casing from names array
    return names.find(original => original.toLowerCase() === n) || n;
  }).slice(0, 5);
}

/**
 * Clean up extracted place name
 */
function cleanPlaceName(name: string): string {
  return name
    .trim()
    .replace(/^(the|a|an)\s+/i, '') // Remove leading articles
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[.,!?]+$/, '') // Remove trailing punctuation
    .trim();
}

/**
 * Check if a name is likely a valid place name
 */
function isValidPlaceName(name: string): boolean {
  // Too short or too long
  if (name.length < 3 || name.length > 30) return false;
  
  // Common words that aren't place names
  const invalidWords = [
    'the', 'this', 'that', 'it', 'there', 'they', 'we', 'i', 'you', 'my',
    'best', 'great', 'good', 'nice', 'amazing', 'new', 'old', 'first', 'last',
    'just', 'really', 'very', 'so', 'not', 'but', 'and', 'or', 'for', 'with',
    'some', 'any', 'all', 'most', 'many', 'few', 'other', 'such', 'only', 'same',
    'today', 'tomorrow', 'yesterday', 'monday', 'tuesday', 'wednesday', 'thursday',
    'friday', 'saturday', 'sunday', 'january', 'february', 'march', 'april', 'may',
    'june', 'july', 'august', 'september', 'october', 'november', 'december',
    'here', 'your', 'their', 'our', 'his', 'her', 'its', 'been', 'being', 'would',
    'should', 'could', 'will', 'have', 'has', 'had', 'do', 'does', 'did', 'is', 'are',
    'was', 'were', 'one', 'two', 'three', 'four', 'five', 'anyone', 'everyone',
    'something', 'nothing', 'everything', 'anything', 'someone', 'nobody',
    'what', 'where', 'when', 'why', 'how', 'which', 'who', 'whom', 'whose',
    'nyc', 'new york', 'brooklyn', 'manhattan', 'queens', 'bronx', 'staten island',
    'part', 'list', 'things', 'stuff', 'place', 'places', 'spot', 'spots', 'area',
  ];
  
  const nameLower = name.toLowerCase();
  
  // Check if it's just a common word
  if (invalidWords.includes(nameLower)) return false;
  
  // Check if it starts with a common word and is only that word
  const firstWord = nameLower.split(/\s+/)[0];
  if (invalidWords.includes(firstWord) && nameLower.split(/\s+/).length === 1) return false;
  
  // Must have at least one letter
  if (!/[a-zA-Z]/.test(name)) return false;
  
  // Shouldn't be all numbers
  if (/^\d+$/.test(name)) return false;
  
  // Should start with a capital or be a known pattern
  if (!/^[A-Z]/.test(name) && !name.includes("'")) return false;
  
  return true;
}

/**
 * Legacy function for backward compatibility
 */
function isCommonWord(word: string): boolean {
  return !isValidPlaceName(word);
}

/**
 * Extract hidden gems from posts
 */
function extractHiddenGems(
  posts: Array<{ title: string; selftext?: string; url: string; permalink: string; score?: number }>,
  category?: string
): RedditContext['hiddenGems'] {
  const gems: RedditContext['hiddenGems'] = [];
  const gemMentions = new Map<string, number>(); // Track how many times each gem is mentioned
  
  // Sort posts by score to prioritize higher-quality recommendations
  const sortedPosts = [...posts].sort((a, b) => (b.score || 0) - (a.score || 0));
  
  for (const post of sortedPosts) {
    const fullText = `${post.title} ${post.selftext || ''}`;
    const textLower = fullText.toLowerCase();
    
    // Check if this post is a recommendation post (more strict)
    const isRecommendationPost = 
      GEM_SEARCH_TERMS.some(term => textLower.includes(term)) ||
      /\b(recommend|suggestion|favorite|love|best)\b/i.test(fullText);
    
    // Also check if it's asking for recommendations (skip those)
    const isAskingPost = /\b(where can i|anyone know|looking for|suggestions?|recommendations?)\s*\?/i.test(fullText);
    
    if (!isRecommendationPost && !isAskingPost) continue;
    
    // For asking posts, only extract from high-upvote comments (which we don't have)
    // So we'll be more selective with what we extract
    if (isAskingPost && !post.selftext) continue;
    
    // Extract place names
    const names = extractPlaceNames(fullText);
    const detectedType = detectPlaceType(fullText);
    
    // Filter by category if specified
    if (category) {
      const categoryLower = category.toLowerCase();
      const typeMatches = detectedType.includes(categoryLower) || 
                          categoryLower.includes(detectedType) ||
                          textLower.includes(categoryLower);
      if (!typeMatches) continue;
    }
    
    for (const name of names) {
      // Skip if name is too generic
      if (name.length < 4) continue;
      
      // Track mentions
      const nameLower = name.toLowerCase();
      gemMentions.set(nameLower, (gemMentions.get(nameLower) || 0) + 1);
      
      // Check if we already have this gem
      const existingGem = gems.find(g => g.name.toLowerCase() === nameLower);
      if (existingGem) {
        existingGem.mentionCount = gemMentions.get(nameLower);
        continue;
      }
      
      // Find the reason/context for the recommendation
      const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 10);
      let reason = '';
      
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes(nameLower) && sentence.length > 20) {
          // Check if sentence has positive sentiment
          const hasPositive = POSITIVE_KEYWORDS.some(kw => sentence.toLowerCase().includes(kw));
          if (hasPositive || sentence.length > 30) {
            reason = sentence.trim();
            if (reason.length > 120) {
              reason = reason.substring(0, 117) + '...';
            }
            break;
          }
        }
      }
      
      // Use title as fallback, but only if it mentions the place
      if (!reason && post.title.toLowerCase().includes(nameLower)) {
        reason = post.title;
      }
      
      // Skip if we couldn't find a good reason
      if (!reason || reason.length < 15) continue;
      
      gems.push({
        name: name.trim(),
        type: detectedType,
        reason,
        sourcePost: `https://reddit.com${post.permalink}`,
        mentionCount: gemMentions.get(nameLower) || 1,
      });
    }
  }
  
  // Sort by mention count, then by name length (longer = more specific)
  const sortedGems = gems.sort((a, b) => {
    const mentionDiff = (b.mentionCount || 1) - (a.mentionCount || 1);
    if (mentionDiff !== 0) return mentionDiff;
    return b.name.length - a.name.length;
  });
  
  return sortedGems.slice(0, 10);
}

// ============================================================================
// LOCAL BUZZ EXTRACTION
// ============================================================================

/**
 * Extract trending topics from post titles
 */
function extractLocalBuzz(
  posts: Array<{ title: string; score: number; num_comments: number }>
): string[] {
  const buzz: string[] = [];
  
  // Sort by engagement (score + comments)
  const sortedPosts = [...posts].sort((a, b) => 
    (b.score + b.num_comments * 2) - (a.score + a.num_comments * 2)
  );
  
  for (const post of sortedPosts.slice(0, 15)) {
    // Clean up title and extract main topic
    let topic = post.title
      .replace(/\[.*?\]/g, '') // Remove tags like [News], [Event]
      .replace(/\(.*?\)/g, '') // Remove parentheticals
      .trim();
    
    // Skip if too short or too long
    if (topic.length < 10 || topic.length > 80) continue;
    
    // Skip questions that are too personal
    if (topic.toLowerCase().startsWith('anyone know') ||
        topic.toLowerCase().startsWith('where can i') ||
        topic.toLowerCase().startsWith('looking for')) {
      continue;
    }
    
    // Truncate if needed
    if (topic.length > 60) {
      topic = topic.substring(0, 57) + '...';
    }
    
    buzz.push(topic);
  }
  
  return buzz.slice(0, 5);
}

// ============================================================================
// REDDIT API CONFIG
// ============================================================================

const REDDIT_BASE_URL = 'https://www.reddit.com';
const USER_AGENT = 'SocialOracle/1.0 (Series Hackathon)';

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 1000; // 1 second between requests

// ============================================================================
// CACHE
// ============================================================================

const contextCache = new Map<string, CacheEntry<RedditContext>>();
const spotCache = new Map<string, CacheEntry<SpotRedditData>>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes for general context
const SPOT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes for spot data

function getCacheKey(city: string, topic?: string): string {
  return `${city.toLowerCase()}:${topic?.toLowerCase() || 'general'}`;
}

function getCachedContext(city: string, topic?: string): RedditContext | null {
  const key = getCacheKey(city, topic);
  const entry = contextCache.get(key);
  
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL_MS) {
    contextCache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCachedContext(city: string, context: RedditContext): void {
  const key = getCacheKey(city, context.topic);
  contextCache.set(key, {
    data: context,
    timestamp: Date.now(),
  });
}

function getCachedSpotData(spotName: string, city: string): SpotRedditData | null {
  const key = `spot:${city.toLowerCase()}:${spotName.toLowerCase()}`;
  const entry = spotCache.get(key);
  
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > SPOT_CACHE_TTL_MS) {
    spotCache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCachedSpotData(spotName: string, city: string, data: SpotRedditData): void {
  const key = `spot:${city.toLowerCase()}:${spotName.toLowerCase()}`;
  spotCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

// ============================================================================
// REDDIT API FUNCTIONS
// ============================================================================

/**
 * Rate-limited fetch for Reddit API
 */
async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest)
    );
  }
  
  lastRequestTime = Date.now();
  
  return fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
    },
  });
}

/**
 * Search Reddit using the public JSON API
 */
async function searchReddit(
  query: string,
  options?: { 
    subreddit?: string;
    limit?: number; 
    sort?: 'relevance' | 'new' | 'top' | 'comments';
    time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  }
): Promise<RedditPost[]> {
  const { subreddit, limit = 25, sort = 'relevance', time = 'year' } = options || {};
  
  try {
    const encodedQuery = encodeURIComponent(query);
    let url: string;
    
    if (subreddit) {
      // Search within specific subreddit
      url = `${REDDIT_BASE_URL}/r/${subreddit}/search.json?q=${encodedQuery}&restrict_sr=1&sort=${sort}&t=${time}&limit=${limit}`;
    } else {
      // Search all of Reddit
      url = `${REDDIT_BASE_URL}/search.json?q=${encodedQuery}&sort=${sort}&t=${time}&limit=${limit}`;
    }
    
    console.log(`📱 Reddit API: Searching "${query}"${subreddit ? ` in r/${subreddit}` : ''}`);
    
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      console.error(`📱 Reddit API: Search failed with status ${response.status}`);
      return [];
    }
    
    const data = await response.json() as any;
    
    if (data?.data?.children) {
      return data.data.children
        .filter((child: any) => child.kind === 't3') // t3 = post
        .map((child: any) => normalizePost(child.data));
    }
    
    return [];
  } catch (error) {
    console.error('📱 Reddit API: Search error:', error);
    return [];
  }
}

/**
 * Get hot posts from a subreddit
 */
async function getHotPosts(subreddit: string, limit: number = 25): Promise<RedditPost[]> {
  try {
    const url = `${REDDIT_BASE_URL}/r/${subreddit}/hot.json?limit=${limit}`;
    
    console.log(`📱 Reddit API: Fetching hot posts from r/${subreddit}`);
    
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`📱 Reddit API: Subreddit r/${subreddit} not found`);
      } else {
        console.error(`📱 Reddit API: Failed with status ${response.status}`);
      }
      return [];
    }
    
    const data = await response.json() as any;
    
    if (data?.data?.children) {
      return data.data.children
        .filter((child: any) => child.kind === 't3')
        .map((child: any) => normalizePost(child.data));
    }
    
    return [];
  } catch (error) {
    console.error(`📱 Reddit API: Error fetching from r/${subreddit}:`, error);
    return [];
  }
}

/**
 * Get top posts from a subreddit
 */
async function getTopPosts(
  subreddit: string, 
  limit: number = 25,
  time: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all' = 'week'
): Promise<RedditPost[]> {
  try {
    const url = `${REDDIT_BASE_URL}/r/${subreddit}/top.json?t=${time}&limit=${limit}`;
    
    console.log(`📱 Reddit API: Fetching top posts from r/${subreddit} (${time})`);
    
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json() as any;
    
    if (data?.data?.children) {
      return data.data.children
        .filter((child: any) => child.kind === 't3')
        .map((child: any) => normalizePost(child.data));
    }
    
    return [];
  } catch (error) {
    console.error(`📱 Reddit API: Error fetching top from r/${subreddit}:`, error);
    return [];
  }
}

/**
 * Get comments for a post
 */
async function getPostComments(postId: string, subreddit: string): Promise<any[]> {
  try {
    const url = `${REDDIT_BASE_URL}/r/${subreddit}/comments/${postId}.json?limit=50&depth=2`;
    
    const response = await rateLimitedFetch(url);
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json() as any;
    
    // Reddit returns [post, comments] array
    if (Array.isArray(data) && data[1]?.data?.children) {
      return data[1].data.children
        .filter((child: any) => child.kind === 't1') // t1 = comment
        .map((child: any) => ({
          id: child.data.id,
          body: child.data.body,
          score: child.data.score,
          author: child.data.author,
        }));
    }
    
    return [];
  } catch (error) {
    console.error('📱 Reddit API: Error fetching comments:', error);
    return [];
  }
}

/**
 * Normalize Reddit API response to our RedditPost type
 */
function normalizePost(post: any): RedditPost {
  return {
    id: post.id || post.name?.replace('t3_', '') || '',
    title: post.title || '',
    selftext: post.selftext || '',
    subreddit: post.subreddit || '',
    score: post.score || post.ups || 0,
    num_comments: post.num_comments || 0,
    url: post.url || '',
    permalink: post.permalink || `/r/${post.subreddit}/comments/${post.id}`,
    created_utc: post.created_utc || Date.now() / 1000,
  };
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get Reddit context for a city
 */
export async function getRedditContext(
  city: string,
  options?: {
    topic?: string;
    includeHiddenGems?: boolean;
    limit?: number;
  }
): Promise<RedditContext> {
  const { topic, includeHiddenGems = true, limit = 25 } = options || {};

  // Check cache first
  const cached = getCachedContext(city, topic);
  if (cached) {
    console.log(`📱 Reddit: Using cached context for "${city}"${topic ? ` (${topic})` : ''}`);
    return cached;
  }

  console.log(`📱 Reddit: Fetching LIVE context for "${city}"${topic ? ` (${topic})` : ''}`);

  // Get subreddits for this city
  const cityLower = city.toLowerCase();
  const subreddits = CITY_SUBREDDITS[cityLower] || [cityLower.replace(/\s+/g, '')];
  
  if (subreddits.length === 0) {
    console.log(`📱 Reddit: No subreddits found for "${city}"`);
    return createEmptyContext(city, topic);
  }

  // Collect posts from various sources
  let allPosts: RedditPost[] = [];

  try {
    const primarySubreddit = subreddits[0];
    
    // Strategy 1: Search within city subreddit with topic
    if (topic) {
      const searchResults = await searchReddit(topic, { 
        subreddit: primarySubreddit, 
        limit, 
        sort: 'relevance',
        time: 'year'
      });
      allPosts.push(...searchResults);
    }

    // Strategy 2: Get hot posts from city subreddit
    const hotPosts = await getHotPosts(primarySubreddit, Math.ceil(limit / 2));
    allPosts.push(...hotPosts);

    // Strategy 3: Get top posts from city subreddit
    const topPosts = await getTopPosts(primarySubreddit, 15, 'week');
    allPosts.push(...topPosts);

    // Strategy 4: If looking for hidden gems, search specifically
    if (includeHiddenGems) {
      const gemQueries = [
        `hidden gem ${topic || ''}`.trim(),
        `underrated ${topic || 'spot'}`,
        `locals recommend`,
        `best ${topic || 'place'}`,
      ];
      
      for (const query of gemQueries.slice(0, 2)) {
        const gemResults = await searchReddit(query, { 
          subreddit: primarySubreddit, 
          limit: 15, 
          sort: 'top',
          time: 'year'
        });
        allPosts.push(...gemResults);
      }
    }
  } catch (error) {
    console.error('📱 Reddit: Error fetching posts:', error);
  }

  // Dedupe posts by ID
  const uniquePosts = Array.from(
    new Map(allPosts.map(p => [p.id, p])).values()
  );

  // Filter by topic if provided
  let filteredPosts = uniquePosts;
  if (topic) {
    const topicLower = topic.toLowerCase();
    const topicWords = topicLower.split(/\s+/).filter(w => w.length > 2);
    
    filteredPosts = uniquePosts.filter(post => {
      const text = `${post.title} ${post.selftext || ''}`.toLowerCase();
      return topicWords.some(word => text.includes(word));
    });
    
    // If filtering removed too many, include some anyway
    if (filteredPosts.length < 5) {
      filteredPosts = uniquePosts.slice(0, Math.max(filteredPosts.length, 15));
    }
  }

  console.log(`📱 Reddit: Got ${uniquePosts.length} unique posts, ${filteredPosts.length} after filtering`);

  // Calculate sentiment
  const { sentiment, sentimentScore } = aggregateSentiment(filteredPosts);

  // Extract top posts with snippets
  const topPostsData = filteredPosts
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(post => ({
      title: post.title,
      subreddit: post.subreddit,
      score: post.score,
      numComments: post.num_comments,
      url: `https://reddit.com${post.permalink}`,
      snippet: extractSnippet(post.selftext || post.title, 150),
    }));

  // Extract hidden gems
  const hiddenGems = includeHiddenGems 
    ? extractHiddenGems(filteredPosts, topic) 
    : [];

  // Extract local buzz
  const localBuzz = extractLocalBuzz(uniquePosts);

  // Generate summary
  const summary = generateContextSummary(filteredPosts, topic, sentiment, hiddenGems);

  const context: RedditContext = {
    city,
    topic,
    sentiment,
    sentimentScore,
    topPosts: topPostsData,
    hiddenGems,
    localBuzz,
    summary,
  };

  // Cache result
  setCachedContext(city, context);

  console.log(`📱 Reddit: Context ready - sentiment: ${sentiment} (${sentimentScore}), ` +
              `${topPostsData.length} posts, ${hiddenGems.length} gems, ${localBuzz.length} buzz items`);

  return context;
}

/**
 * Get Reddit data for a specific spot (restaurant, bar, etc.)
 * This is used to enrich spot data with real Reddit sentiment
 */
export async function getSpotRedditData(
  spotName: string,
  city: string,
  spotType?: string
): Promise<SpotRedditData> {
  // Check cache first
  const cached = getCachedSpotData(spotName, city);
  if (cached) {
    console.log(`📱 Reddit: Using cached data for "${spotName}"`);
    return cached;
  }

  console.log(`📱 Reddit: Fetching LIVE data for spot "${spotName}" in ${city}`);

  const cityLower = city.toLowerCase();
  const subreddits = CITY_SUBREDDITS[cityLower] || [cityLower.replace(/\s+/g, '')];
  const primarySubreddit = subreddits[0] || city.toLowerCase().replace(/\s+/g, '');

  let allPosts: RedditPost[] = [];

  try {
    // Search for the spot name in the city subreddit
    const searchResults = await searchReddit(spotName, {
      subreddit: primarySubreddit,
      limit: 20,
      sort: 'relevance',
      time: 'all',
    });
    allPosts.push(...searchResults);

    // Also search with city name for broader results
    if (allPosts.length < 5) {
      const broadResults = await searchReddit(`${spotName} ${city}`, {
        limit: 15,
        sort: 'relevance',
        time: 'all',
      });
      allPosts.push(...broadResults);
    }

    // If we have a spot type, search for that combo too
    if (spotType && allPosts.length < 10) {
      const typeResults = await searchReddit(`${spotName} ${spotType}`, {
        subreddit: primarySubreddit,
        limit: 10,
        sort: 'relevance',
        time: 'all',
      });
      allPosts.push(...typeResults);
    }
  } catch (error) {
    console.error(`📱 Reddit: Error fetching data for "${spotName}":`, error);
  }

  // Dedupe by ID
  const uniquePosts = Array.from(
    new Map(allPosts.map(p => [p.id, p])).values()
  );

  // Filter to posts that actually mention the spot
  const spotNameLower = spotName.toLowerCase();
  const relevantPosts = uniquePosts.filter(post => {
    const text = `${post.title} ${post.selftext || ''}`.toLowerCase();
    return text.includes(spotNameLower) || 
           spotNameLower.split(/\s+/).every(word => text.includes(word));
  });

  console.log(`📱 Reddit: Found ${relevantPosts.length} posts mentioning "${spotName}"`);

  // Calculate sentiment
  const { sentiment, sentimentScore } = aggregateSentiment(relevantPosts);

  // Extract recommendations/quotes about the spot
  const recommendations = extractRecommendations(relevantPosts, spotName);

  // Generate summary
  const summary = generateSpotSummary(spotName, relevantPosts, sentiment, recommendations);

  // Get recent mentions
  const recentMentions = relevantPosts
    .sort((a, b) => b.created_utc - a.created_utc)
    .slice(0, 5)
    .map(post => ({
      title: post.title,
      snippet: extractSnippet(post.selftext || post.title, 100),
      score: post.score,
      url: `https://reddit.com${post.permalink}`,
      date: new Date(post.created_utc * 1000),
    }));

  const spotData: SpotRedditData = {
    spotName,
    sentiment,
    sentimentScore,
    mentionCount: relevantPosts.length,
    summary,
    recentMentions,
    recommendations,
  };

  // Cache result
  setCachedSpotData(spotName, city, spotData);

  return spotData;
}

/**
 * Batch get Reddit data for multiple spots (efficient for loading lists)
 */
export async function batchGetSpotRedditData(
  spots: Array<{ name: string; type?: string }>,
  city: string
): Promise<Map<string, SpotRedditData>> {
  console.log(`📱 Reddit: Batch fetching data for ${spots.length} spots in ${city}`);
  
  const results = new Map<string, SpotRedditData>();
  
  // Process in batches of 3 to respect rate limits
  const batchSize = 3;
  for (let i = 0; i < spots.length; i += batchSize) {
    const batch = spots.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(spot => 
        getSpotRedditData(spot.name, city, spot.type)
          .catch(err => {
            console.error(`📱 Reddit: Error fetching "${spot.name}":`, err);
            return createEmptySpotData(spot.name);
          })
      )
    );
    
    batchResults.forEach((data, idx) => {
      results.set(batch[idx].name, data);
    });
    
    // Small delay between batches
    if (i + batchSize < spots.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

/**
 * Get personalized Reddit recommendations based on user preferences
 */
export async function getPersonalizedRecommendations(
  city: string,
  preferences: {
    vibes?: string[];
    interests?: string[];
    foodPreferences?: string[];
    budgetTier?: string;
  }
): Promise<RedditContext> {
  console.log(`📱 Reddit: Getting personalized recommendations for ${city}`);
  
  const { vibes = [], interests = [], foodPreferences = [] } = preferences;
  
  // Build search queries from preferences
  const searchTerms: string[] = [];
  
  if (vibes.length > 0) {
    searchTerms.push(...vibes.slice(0, 2));
  }
  if (interests.length > 0) {
    searchTerms.push(...interests.slice(0, 2));
  }
  if (foodPreferences.length > 0) {
    searchTerms.push(...foodPreferences.slice(0, 2));
  }
  
  // Default to general recommendations
  if (searchTerms.length === 0) {
    searchTerms.push('best spots', 'recommendations');
  }
  
  // Combine into a topic
  const topic = searchTerms.join(' ');
  
  return getRedditContext(city, {
    topic,
    includeHiddenGems: true,
    limit: 30,
  });
}

/**
 * Find hidden gems in a city
 */
export async function findHiddenGems(
  city: string,
  category?: string
): Promise<RedditContext['hiddenGems']> {
  console.log(`📱 Reddit: Finding hidden gems in "${city}"${category ? ` (${category})` : ''}`);

  const cityLower = city.toLowerCase();
  const subreddits = CITY_SUBREDDITS[cityLower] || [cityLower.replace(/\s+/g, '')];
  const primarySubreddit = subreddits[0] || cityLower.replace(/\s+/g, '');
  
  let allPosts: RedditPost[] = [];

  try {
    // Search for hidden gems within city subreddit
    const searchQueries = [
      `hidden gem ${category || ''}`.trim(),
      `underrated ${category || 'spot'}`,
      `locals favorite ${category || ''}`.trim(),
      `best ${category || 'place'} not touristy`,
    ];

    for (const query of searchQueries) {
      const results = await searchReddit(query, { 
        subreddit: primarySubreddit,
        limit: 20, 
        sort: 'top',
        time: 'year'
      });
      allPosts.push(...results);
    }

    // Also get top posts from city subreddit
    const topPosts = await getTopPosts(primarySubreddit, 25, 'month');
    allPosts.push(...topPosts);
  } catch (error) {
    console.error('📱 Reddit: Error searching for hidden gems:', error);
  }

  // Dedupe
  const uniquePosts = Array.from(
    new Map(allPosts.map(p => [p.id, p])).values()
  );

  // Extract gems
  const gems = extractHiddenGems(uniquePosts, category);
  
  console.log(`📱 Reddit: Found ${gems.length} hidden gems`);
  return gems;
}

// ============================================================================
// SUMMARY GENERATION
// ============================================================================

/**
 * Extract a snippet from text
 */
function extractSnippet(text: string, maxLength: number): string {
  if (!text) return '';
  
  // Clean up text
  let cleaned = text
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (cleaned.length <= maxLength) return cleaned;
  
  // Try to cut at sentence boundary
  const truncated = cleaned.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastExclaim = truncated.lastIndexOf('!');
  
  const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclaim);
  
  if (lastSentenceEnd > maxLength * 0.5) {
    return cleaned.substring(0, lastSentenceEnd + 1);
  }
  
  // Cut at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  return cleaned.substring(0, lastSpace > 0 ? lastSpace : maxLength) + '...';
}

/**
 * Extract recommendations/quotes about a spot from posts
 */
function extractRecommendations(posts: RedditPost[], spotName: string): string[] {
  const recommendations: string[] = [];
  const spotNameLower = spotName.toLowerCase();
  
  for (const post of posts) {
    const text = post.selftext || '';
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase();
      
      // Check if sentence mentions the spot and has positive sentiment
      if (sentenceLower.includes(spotNameLower) || 
          spotNameLower.split(/\s+/).every(word => sentenceLower.includes(word))) {
        
        // Check for positive indicators
        const hasPositive = POSITIVE_KEYWORDS.some(kw => sentenceLower.includes(kw));
        const hasNegative = NEGATIVE_KEYWORDS.some(kw => sentenceLower.includes(kw));
        
        if (hasPositive && !hasNegative) {
          const cleaned = sentence.trim();
          if (cleaned.length > 20 && cleaned.length < 200) {
            recommendations.push(cleaned);
          }
        }
      }
    }
  }
  
  // Dedupe and limit
  return [...new Set(recommendations)].slice(0, 5);
}

/**
 * Generate a summary for context
 */
function generateContextSummary(
  posts: RedditPost[],
  topic: string | undefined,
  sentiment: string,
  hiddenGems: RedditContext['hiddenGems']
): string {
  if (posts.length === 0) {
    return topic 
      ? `No recent Reddit discussions found about ${topic}.`
      : 'No recent Reddit discussions found.';
  }
  
  const parts: string[] = [];
  
  // Sentiment summary
  if (sentiment === 'very_positive' || sentiment === 'positive') {
    parts.push(`Reddit users are generally positive about ${topic || 'this area'}`);
  } else if (sentiment === 'very_negative' || sentiment === 'negative') {
    parts.push(`Reddit users have mixed or negative opinions about ${topic || 'this area'}`);
  } else {
    parts.push(`Reddit discussions about ${topic || 'this area'} show varied opinions`);
  }
  
  // Hidden gems mention
  if (hiddenGems.length > 0) {
    const gemNames = hiddenGems.slice(0, 3).map(g => g.name).join(', ');
    parts.push(`Popular recommendations include ${gemNames}`);
  }
  
  // Activity level
  const totalEngagement = posts.reduce((sum, p) => sum + p.score + p.num_comments, 0);
  if (totalEngagement > 1000) {
    parts.push('with high community engagement');
  }
  
  return parts.join(', ') + '.';
}

/**
 * Generate a summary for a specific spot
 */
function generateSpotSummary(
  spotName: string,
  posts: RedditPost[],
  sentiment: string,
  recommendations: string[]
): string {
  if (posts.length === 0) {
    return `No Reddit discussions found about ${spotName}.`;
  }
  
  const parts: string[] = [];
  
  // Mention count
  parts.push(`${spotName} has ${posts.length} mention${posts.length > 1 ? 's' : ''} on Reddit`);
  
  // Sentiment
  if (sentiment === 'very_positive') {
    parts.push('with overwhelmingly positive reviews');
  } else if (sentiment === 'positive') {
    parts.push('with mostly positive feedback');
  } else if (sentiment === 'negative' || sentiment === 'very_negative') {
    parts.push('with mixed to negative reviews');
  } else {
    parts.push('with mixed opinions');
  }
  
  // Add a recommendation quote if available
  if (recommendations.length > 0) {
    const shortRec = recommendations[0].substring(0, 80);
    parts.push(`- "${shortRec}${recommendations[0].length > 80 ? '...' : ''}"`);
  }
  
  return parts.join(' ');
}

/**
 * Create empty spot data
 */
function createEmptySpotData(spotName: string): SpotRedditData {
  return {
    spotName,
    sentiment: 'neutral',
    sentimentScore: 0,
    mentionCount: 0,
    summary: `No Reddit data available for ${spotName}.`,
    recentMentions: [],
    recommendations: [],
  };
}

/**
 * Get local sentiment about a topic in a city
 */
export async function getLocalSentiment(
  city: string,
  topic: string
): Promise<{ sentiment: RedditContext['sentiment']; score: number; samplePosts: string[]; summary: string }> {
  console.log(`📱 Reddit: Getting sentiment for "${topic}" in "${city}"`);

  const cityLower = city.toLowerCase();
  const subreddits = CITY_SUBREDDITS[cityLower] || [cityLower.replace(/\s+/g, '')];
  const primarySubreddit = subreddits[0] || cityLower.replace(/\s+/g, '');

  const posts = await searchReddit(topic, { 
    subreddit: primarySubreddit, 
    limit: 30, 
    sort: 'relevance',
    time: 'year'
  });

  if (posts.length === 0) {
    return { 
      sentiment: 'neutral', 
      score: 0, 
      samplePosts: [],
      summary: `No Reddit discussions found about "${topic}" in ${city}.`
    };
  }

  const { sentiment, sentimentScore } = aggregateSentiment(posts);
  const samplePosts = posts.slice(0, 3).map(p => p.title);
  
  const sentimentText = sentiment === 'very_positive' ? 'very positive' :
                        sentiment === 'positive' ? 'positive' :
                        sentiment === 'negative' ? 'negative' :
                        sentiment === 'very_negative' ? 'very negative' : 'mixed';
  
  const summary = `Reddit sentiment for "${topic}" in ${city} is ${sentimentText} based on ${posts.length} discussions.`;

  return {
    sentiment,
    score: sentimentScore,
    samplePosts,
    summary,
  };
}

/**
 * Get trending topics in a city
 */
export async function getTrendingTopics(city: string): Promise<string[]> {
  console.log(`📱 Reddit: Getting trending topics in "${city}"`);

  const cityLower = city.toLowerCase();
  const subreddits = CITY_SUBREDDITS[cityLower] || [cityLower.replace(/\s+/g, '')];
  
  let allPosts: RedditPost[] = [];

  try {
    // Get hot posts from primary city subreddit
    const primarySubreddit = subreddits[0];
    if (primarySubreddit) {
      const hotPosts = await getHotPosts(primarySubreddit, 25);
      allPosts.push(...hotPosts);
    }
    
    // Also get rising posts if we need more
    if (allPosts.length < 10 && subreddits[1]) {
      const morePosts = await getHotPosts(subreddits[1], 15);
      allPosts.push(...morePosts);
    }
  } catch (error) {
    console.error('📱 Reddit: Error fetching trending topics:', error);
  }

  return extractLocalBuzz(allPosts);
}

/**
 * Create empty context for cases with no data
 */
function createEmptyContext(city: string, topic?: string): RedditContext {
  return {
    city,
    topic,
    sentiment: 'neutral',
    sentimentScore: 0,
    topPosts: [],
    hiddenGems: [],
    localBuzz: [],
    summary: `No Reddit data available for ${city}${topic ? ` (${topic})` : ''}.`,
  };
}

/**
 * Clear Reddit cache
 */
export function clearRedditCache(): void {
  contextCache.clear();
  spotCache.clear();
  console.log('📱 Reddit: All caches cleared');
}

/**
 * Clear only spot cache
 */
export function clearSpotCache(): void {
  spotCache.clear();
  console.log('📱 Reddit: Spot cache cleared');
}

/**
 * Check if city is supported
 */
export function isCitySupported(city: string): boolean {
  const cityLower = city.toLowerCase();
  return cityLower in CITY_SUBREDDITS;
}

/**
 * Get supported cities
 */
export function getSupportedCities(): string[] {
  return Object.keys(CITY_SUBREDDITS).filter(city => 
    // Filter out abbreviations/aliases, keep full names
    city.includes(' ') || city.length > 4
  );
}

/**
 * Get subreddits for a city
 */
export function getCitySubreddits(city: string): string[] {
  const cityLower = city.toLowerCase();
  return CITY_SUBREDDITS[cityLower] || [cityLower.replace(/\s+/g, '')];
}
