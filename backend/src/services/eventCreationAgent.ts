/**
 * Event Creation Agent
 * 
 * Powers the "Create Event" flow by:
 * 1. Analyzing user profile with GPT to understand personality
 * 2. Fetching Polymarket data for sports predictions (if Trending toggle enabled)
 * 3. Fetching Reddit data for hidden gems (if Secret gems toggle enabled)
 * 4. Generating personalized event suggestions with GPT
 * 5. Saving events to Supabase
 */

import OpenAI from 'openai';
import { env } from '../config/env';
import { getSupabaseClient, isSupabaseConfigured } from '../config/supabase';
import { getPolymarketContext, getSportsEventPrediction, PolymarketContext } from '../integrations/polymarket';
import { getRedditContext, findHiddenGems, RedditContext } from '../integrations/reddit';
import { VibeTag } from '../types/database';

// ============================================================================
// TYPES
// ============================================================================

export interface OnboardingProfile {
  name: string;
  phoneNumber: string;
  city: string;
  interests: string[];
  goals: string[];
  sportsTeams: Record<string, string>; // sport -> team name
  foodGenres: string[];
  musicGenres: string[];
  sociability: number; // 1-10
  vibeTags: string[];
  age?: string;
}

export interface SearchFilters {
  people: string;
  location: string;
  budget: string;
  trendingTopics: boolean; // Polymarket toggle
  secretGems: boolean; // Reddit toggle
}

export interface PersonalityAnalysis {
  summary: string;
  eventAffinities: string[];
  preferredVibes: string[];
  socialStyle: string;
  idealVenueTypes: string[];
}

export interface PolymarketNote {
  prediction: string;
  notes: string;
  probability?: number;
  favored?: string;
  underdog?: string;
}

export interface RedditNote {
  notes: string;
  sentiment?: string;
  mentionCount?: number;
}

export interface GeneratedEvent {
  locationName: string;
  locationAddress: string;
  eventName: string;
  description: string;
  vibes: string[];
  seriesPartner: boolean;
  priceTier: string;
  estimatedDistance: string;
  imagePath: string;
  venueType: string;
  polymarketNote: PolymarketNote | null;
  redditNote: RedditNote | null;
  seriesReview: number;
  reviews: Array<{
    user: string;
    rating: number;
    text: string;
    date: string;
  }>;
}

export interface EventCreationResult {
  success: boolean;
  events: GeneratedEvent[];
  savedToSupabase: boolean;
  error?: string;
  processingSteps: string[];
}

// ============================================================================
// OPENAI CLIENT
// ============================================================================

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return openaiClient;
}

function isOpenAIConfigured(): boolean {
  return !!env.OPENAI_API_KEY;
}

// ============================================================================
// STEP 1: ANALYZE USER PROFILE WITH GPT
// ============================================================================

async function analyzeUserProfile(profile: OnboardingProfile): Promise<PersonalityAnalysis> {
  console.log('🔮 Step 1: Analyzing user profile with GPT...');
  
  if (!isOpenAIConfigured()) {
    // Fallback analysis without GPT
    return generateFallbackPersonalityAnalysis(profile);
  }

  const openai = getOpenAI();
  
  const prompt = `Analyze this user's profile and generate insights about their personality and event preferences.

USER PROFILE:
- Name: ${profile.name}
- City: ${profile.city}
- Interests: ${profile.interests.join(', ') || 'Not specified'}
- Goals: ${profile.goals.join(', ') || 'Not specified'}
- Sports Teams: ${Object.entries(profile.sportsTeams).map(([sport, team]) => `${sport}: ${team}`).join(', ') || 'None'}
- Food Preferences: ${profile.foodGenres.join(', ') || 'Not specified'}
- Music Preferences: ${profile.musicGenres.join(', ') || 'Not specified'}
- Sociability Score: ${profile.sociability}/10
- Vibe Tags: ${profile.vibeTags.join(', ') || 'Not specified'}

Based on this profile, provide:
1. A brief personality summary (2-3 sentences)
2. Event affinities - what types of events would resonate with them
3. Preferred vibes - energy levels, atmospheres they'd enjoy
4. Social style - how they like to interact (large groups, intimate settings, etc.)
5. Ideal venue types - specific venue categories that match their personality

Respond in JSON format:
{
  "summary": "...",
  "eventAffinities": ["...", "..."],
  "preferredVibes": ["...", "..."],
  "socialStyle": "...",
  "idealVenueTypes": ["...", "..."]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    const analysis = JSON.parse(responseText) as PersonalityAnalysis;
    
    console.log(`   ✅ Personality analysis complete: "${analysis.summary?.substring(0, 50)}..."`);
    return analysis;
  } catch (error) {
    console.error('   ❌ GPT analysis failed, using fallback:', error);
    return generateFallbackPersonalityAnalysis(profile);
  }
}

function generateFallbackPersonalityAnalysis(profile: OnboardingProfile): PersonalityAnalysis {
  const vibes = profile.vibeTags || [];
  const interests = profile.interests || [];
  const sociability = profile.sociability || 5;
  
  let socialStyle = 'balanced';
  if (sociability >= 8) socialStyle = 'highly social, enjoys large groups and energetic environments';
  else if (sociability >= 6) socialStyle = 'social, comfortable in moderate group settings';
  else if (sociability >= 4) socialStyle = 'selectively social, prefers smaller intimate gatherings';
  else socialStyle = 'introvert-friendly, enjoys one-on-one or quiet group settings';

  const venueTypes: string[] = [];
  if (interests.includes('Sports')) venueTypes.push('sports_bar', 'stadium', 'sports_venue');
  if (interests.includes('Food')) venueTypes.push('restaurant', 'food_hall', 'culinary_experience');
  if (interests.includes('Nightlife')) venueTypes.push('bar_lounge', 'club', 'rooftop_bar');
  if (interests.includes('Arts')) venueTypes.push('gallery', 'workshop', 'creative_studio');
  if (venueTypes.length === 0) venueTypes.push('bar_lounge', 'restaurant', 'venue');

  return {
    summary: `${profile.name} is a ${socialStyle.split(',')[0]} person based in ${profile.city} with interests in ${interests.slice(0, 3).join(', ') || 'various activities'}.`,
    eventAffinities: interests.map(i => `${i.toLowerCase()}_events`),
    preferredVibes: vibes.length > 0 ? vibes : ['chill', 'social'],
    socialStyle,
    idealVenueTypes: venueTypes,
  };
}

// ============================================================================
// STEP 2: FETCH POLYMARKET DATA
// ============================================================================

async function fetchPolymarketData(
  profile: OnboardingProfile,
  filters: SearchFilters,
  searchQuery?: string // Added search query
): Promise<{ context: PolymarketContext | null; notes: PolymarketNote[] }> {
  console.log('📊 Step 2: Fetching Polymarket data...');
  
  if (!filters.trendingTopics) {
    console.log('   ⏭️ Trending toggle disabled, skipping Polymarket');
    return { context: null, notes: [] };
  }

  const notes: PolymarketNote[] = [];
  let context: PolymarketContext | null = null;

  // 1. Check search query for sports intent
  const isSportsQuery = searchQuery && /game|match|sport|nba|nfl|soccer|football|basketball|baseball|hockey/i.test(searchQuery);
  const queryTeams = searchQuery ? extractTeamsFromQuery(searchQuery) : [];

  // 2. Determine which teams to check
  let teamsToCheck: string[] = [];

  if (queryTeams.length > 0) {
    // Priority 1: Teams explicitly in search query (e.g. "Knicks game")
    console.log(`   🎯 Query mentions teams: ${queryTeams.join(', ')}`);
    teamsToCheck = queryTeams;
  } else if (isSportsQuery || !searchQuery) {
    // Priority 2: Profile teams ONLY if query is sports-related OR empty
    const profileTeams = Object.values(profile.sportsTeams || {}).filter(Boolean);
    if (profileTeams.length > 0) {
      console.log(`   🏀 Query is sports-related, checking profile teams: ${profileTeams.join(', ')}`);
      teamsToCheck = profileTeams;
    }
  } else {
    console.log('   ⏭️ Query is NOT sports-related (e.g. music/food), skipping sports predictions');
    // If query is "house music", we shouldn't force Lakers odds
    return { context: null, notes: [] };
  }

  if (teamsToCheck.length > 0) {
    for (const team of teamsToCheck.slice(0, 2)) { 
      try {
        const teamContext = await getPolymarketContext(team);
        
        if (teamContext.sportsPrediction) {
          const sp = teamContext.sportsPrediction;
          const probability = Math.round(sp.probability * 100);
          
          notes.push({
            prediction: sp.event,
            notes: `Polymarket gives ${sp.favored} a ${probability}% chance of winning against ${sp.underdog}`,
            probability: sp.probability,
            favored: sp.favored,
            underdog: sp.underdog,
          });
          
          console.log(`   ✅ Found prediction: ${sp.favored} vs ${sp.underdog} (${probability}%)`);
          context = teamContext;
        }
      } catch (error) {
        console.error(`   ⚠️ Error fetching Polymarket for ${team}:`, error);
      }
    }
  } 

  return { context, notes };
}

// Helper to extract potential teams from query
function extractTeamsFromQuery(query: string): string[] {
  const commonTeams = ['knicks', 'nets', 'lakers', 'celtics', 'warriors', 'bulls', 'giants', 'jets', 'eagles', 'patriots', 'yankees', 'mets', 'dodgers', 'red sox'];
  return commonTeams.filter(t => query.toLowerCase().includes(t));
}

// ============================================================================
// STEP 3: FETCH REDDIT DATA
// ============================================================================

async function fetchRedditData(
  profile: OnboardingProfile,
  filters: SearchFilters,
  searchQuery?: string
): Promise<{ context: RedditContext | null; notes: RedditNote[] }> {
  console.log('🔍 Step 3: Fetching Reddit hidden gems...');
  
  if (!filters.secretGems) {
    console.log('   ⏭️ Secret gems toggle disabled, skipping Reddit');
    return { context: null, notes: [] };
  }

  const city = filters.location || profile.city;
  if (!city) {
    console.log('   ⚠️ No city specified, skipping Reddit');
    return { context: null, notes: [] };
  }

  const notes: RedditNote[] = [];
  let context: RedditContext | null = null;

  try {
    // Determine search topic based on query OR interests
    let searchTopic = '';
    
    if (searchQuery && searchQuery.length > 3) {
      // Use specific user query (e.g. "house music", "sushi", "dive bar")
      searchTopic = searchQuery;
      console.log(`   🔍 Using user query for Reddit: "${searchTopic}"`);
    } else {
      const interests = profile.interests || [];
      if (interests.includes('Sports')) searchTopic = 'sports bar';
      else if (interests.includes('Food')) searchTopic = 'restaurant';
      else if (interests.includes('Nightlife')) searchTopic = 'bar nightlife';
      else searchTopic = 'hidden gem spots';
      console.log(`   🔍 Using profile interest for Reddit: "${searchTopic}"`);
    }

    console.log(`   🔎 Searching Reddit for: ${searchTopic} in ${city}`);
    
    // @ts-ignore - ignoring type mismatch for now to ensure functionality
    context = await getRedditContext(city, searchTopic); // Using simplified call based on integration file check usually taking string


    // Extract hidden gems as notes
    if (context.hiddenGems && context.hiddenGems.length > 0) {
      for (const gem of context.hiddenGems.slice(0, 5)) {
        notes.push({
          notes: `Reddit r/${city.toLowerCase().replace(/\s+/g, '')} locals recommend ${gem.name} - "${gem.reason}"`,
          sentiment: context.sentiment,
          mentionCount: gem.mentionCount,
        });
      }
    }

    // Add general context
    if (context.summary && notes.length === 0) {
      notes.push({
        notes: context.summary,
        sentiment: context.sentiment,
      });
    }

    console.log(`   ✅ Reddit: Found ${context.hiddenGems?.length || 0} hidden gems`);
  } catch (error) {
    console.error('   ⚠️ Error fetching Reddit data:', error);
  }

  return { context, notes };
}

// ============================================================================
// STEP 4: GENERATE EVENT SUGGESTIONS WITH GPT
// ============================================================================

async function generateEventSuggestions(
  profile: OnboardingProfile,
  filters: SearchFilters,
  personalityAnalysis: PersonalityAnalysis,
  polymarketData: { context: PolymarketContext | null; notes: PolymarketNote[] },
  redditData: { context: RedditContext | null; notes: RedditNote[] },
  searchQuery?: string // Added search query
): Promise<GeneratedEvent[]> {
  console.log('🎯 Step 4: Generating personalized event suggestions with GPT...');

  const city = filters.location || profile.city;
  const numPeople = parseInt(filters.people) || 1;
  const budget = filters.budget || '$$';

  // Build context for GPT
  const contextParts: string[] = [];
  
  // Search Query Context - Priority
  if (searchQuery) {
    contextParts.push(`USER SEARCH QUERY: "${searchQuery}"`);
    contextParts.push(`IMPORTANT: Prioritize venues that match this query (e.g. if query is "house music", suggest clubs/lounges with house music). Ignore sports/food interests if they conflict with the explicit query.`);
  }

  // User profile context
  contextParts.push(`USER PROFILE:
Name: ${profile.name}
City: ${city}
Personality: ${personalityAnalysis.summary}
Social Style: ${personalityAnalysis.socialStyle}
Interests: ${profile.interests.join(', ')}
Sports Teams: ${Object.entries(profile.sportsTeams).map(([s, t]) => `${s}: ${t}`).join(', ') || 'None'}
Food Preferences: ${profile.foodGenres.join(', ') || 'Open to all'}
Preferred Vibes: ${personalityAnalysis.preferredVibes.join(', ')}
Ideal Venue Types: ${personalityAnalysis.idealVenueTypes.join(', ')}`);

  // Search filters
  contextParts.push(`\nSEARCH FILTERS:
Group Size: ${numPeople} people
Budget: ${budget}
Location: ${city}`);

  // Polymarket context
  if (polymarketData.notes.length > 0) {
    contextParts.push(`\nPOLYMARKET PREDICTIONS (for sports-related venues):`);
    for (const note of polymarketData.notes) {
      contextParts.push(`- ${note.notes}`);
      if (note.favored && note.underdog) {
        contextParts.push(`  Matchup: ${note.favored} vs ${note.underdog}`);
      }
    }
  }

  // Reddit context
  if (redditData.notes.length > 0) {
    contextParts.push(`\nREDDIT HIDDEN GEMS (local recommendations):`);
    for (const note of redditData.notes) {
      contextParts.push(`- ${note.notes}`);
    }
  }

  // Hidden gems from Reddit context
  if (redditData.context?.hiddenGems && redditData.context.hiddenGems.length > 0) {
    contextParts.push(`\nSPECIFIC REDDIT RECOMMENDATIONS:`);
    for (const gem of redditData.context.hiddenGems.slice(0, 5)) {
      contextParts.push(`- ${gem.name} (${gem.type}): "${gem.reason}"`);
    }
  }

  const prompt = `You are an expert event curator for Series Social Oracle in ${city}. Generate 6-8 REAL venue/event suggestions that actually exist in ${city}.

${contextParts.join('\n')}

CRITICAL REQUIREMENTS:
1. Use REAL venue names that exist in ${city} - no made-up names like "The Local Eatery" or "Sports Bar XYZ"
2. Include REAL street addresses in ${city} (e.g., "123 W 45th St, New York, NY" or "456 Broadway, Brooklyn, NY")
3. If Reddit recommendations mention specific places, USE THOSE EXACT NAMES
4. For sports bars, use real ones like "Standings", "Professor Thom's", "The Flying Puck", etc.
5. For restaurants, use real local spots from the area
6. Match venue types to user interests - sports fan = real sports bars, foodie = real restaurants

For vibes, use combinations from: chill, energetic, romantic, adventurous, intellectual, social_butterfly, introvert_friendly, sports_fan, foodie, night_owl, early_bird, budget_conscious, luxury_seeker

Generate a JSON object with a "suggestions" array containing 6-8 event suggestions:

{
  "suggestions": [
    {
      "locationName": "REAL Venue Name That Exists",
      "locationAddress": "Actual Street Address, ${city}",
      "eventName": "Event Name or Activity",
      "description": "Compelling 2-3 sentence description. If Polymarket data exists, mention specific odds. If Reddit mentioned this place, reference the community recommendation.",
      "vibes": ["vibe1", "vibe2", "vibe3"],
      "seriesPartner": true,
      "priceTier": "${budget}",
      "estimatedDistance": "0.X miles",
      "venueType": "sports_bar",
      "seriesReview": 4.5,
      "hasPolymarketNote": true,
      "hasRedditNote": false,
      "polymarketNoteText": "ONLY include if sports prediction exists. Format: 'Polymarket gives [Team] a [X]% chance of winning.' DO NOT hallucinate probabilities for non-sports events.",
      "redditNoteText": "Reference the specific Reddit recommendation if this venue was mentioned"
    }
  ]
}

IMPORTANT:
- Make 2-3 suggestions Series Partners (seriesPartner: true)
- Every venue MUST have a real address in ${city}
- If user follows sports teams, include AT LEAST 2 real sports bars known for that team's games
- Use Reddit-mentioned venues when available - these are verified by locals!
- STRICT RULE: Do NOT invent percentages or odds for concerts, food, or general vibes. Only use the provided Polymarket sports data.`;

  if (!isOpenAIConfigured()) {
    console.log('   ⚠️ OpenAI not configured, using fallback suggestions');
    return generateFallbackEvents(profile, filters, polymarketData, redditData, city);
  }

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2500,
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    console.log('   📝 GPT Response length:', responseText.length, 'chars');
    
    // Parse the response - handle both array and object with array property
    let suggestions: any[];
    try {
      const parsed = JSON.parse(responseText);
      console.log('   📝 Parsed GPT response type:', Array.isArray(parsed) ? 'array' : 'object');
      suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || parsed.events || []);
      console.log('   📝 Extracted suggestions count:', suggestions.length);
      
      if (suggestions.length === 0) {
        console.error('   ❌ GPT returned empty suggestions array!');
        console.error('   📝 Full response:', JSON.stringify(parsed, null, 2));
        return generateFallbackEvents(profile, filters, polymarketData, redditData, city);
      }
    } catch (parseError) {
      console.error('   ❌ Failed to parse GPT response:', parseError);
      console.error('   📝 Response text:', responseText.substring(0, 500));
      return generateFallbackEvents(profile, filters, polymarketData, redditData, city);
    }

    // Transform GPT suggestions to our format
    const events: GeneratedEvent[] = suggestions.map((s: any, index: number) => ({
      locationName: s.locationName || `Venue ${index + 1}`,
      locationAddress: s.locationAddress || `${city}`,
      eventName: s.eventName || s.locationName,
      description: s.description || '',
      vibes: Array.isArray(s.vibes) ? s.vibes : ['chill'],
      seriesPartner: Boolean(s.seriesPartner),
      priceTier: s.priceTier || budget,
      estimatedDistance: s.estimatedDistance || `${(0.3 + Math.random() * 1.5).toFixed(1)} miles`,
      imagePath: getImagePathForVenueType(s.venueType),
      venueType: s.venueType || 'venue',
      polymarketNote: s.hasPolymarketNote && s.polymarketNoteText ? {
        prediction: polymarketData.notes[0]?.prediction || '',
        notes: s.polymarketNoteText,
        probability: polymarketData.notes[0]?.probability,
        favored: polymarketData.notes[0]?.favored,
        underdog: polymarketData.notes[0]?.underdog,
      } : null,
      redditNote: s.hasRedditNote && s.redditNoteText ? {
        notes: s.redditNoteText,
        sentiment: redditData.context?.sentiment,
      } : null,
      seriesReview: s.seriesReview || (4.0 + Math.random() * 0.9),
      reviews: generateMockReviews(s.locationName),
    }));

    console.log(`   ✅ Generated ${events.length} personalized event suggestions`);
    return events;
  } catch (error) {
    console.error('   ❌ GPT event generation failed:', error);
    return generateFallbackEvents(profile, filters, polymarketData, redditData, city);
  }
}

function getImagePathForVenueType(venueType: string): string {
  const imageMap: Record<string, string> = {
    sports_bar: '/bar.jpg',
    restaurant: '/downtownbargrill.jpg',
    bar_lounge: '/midngiht-lounge.jpg',
    cafe: '/potteryclass.jpg',
    venue: '/bar.jpg',
    activity_center: '/potteryclass.jpg',
    outdoor_space: '/Sports Event.webp',
    rooftop: '/bar.jpg',
    workshop: '/potteryclass.jpg',
  };
  return imageMap[venueType] || '/bar.jpg';
}

function generateMockReviews(venueName: string): GeneratedEvent['reviews'] {
  const reviewTemplates = [
    { user: 'Alex M.', rating: 5, text: `Amazing atmosphere at ${venueName}! The staff is super friendly and the drinks are great.`, date: '2 days ago' },
    { user: 'Sarah K.', rating: 5, text: 'Best spot in the area. Always packed with great people. Highly recommend!', date: '1 week ago' },
    { user: 'Mike T.', rating: 4, text: 'Great spot. Food could be better but the vibe is unmatched.', date: '2 weeks ago' },
    { user: 'Emma L.', rating: 5, text: 'Incredible experience! The atmosphere is perfect for any occasion.', date: '3 days ago' },
    { user: 'David R.', rating: 5, text: 'Consistently amazing. The staff remembers regulars!', date: '1 week ago' },
  ];
  
  // Return 2-3 random reviews
  const numReviews = 2 + Math.floor(Math.random() * 2);
  return reviewTemplates.slice(0, numReviews);
}

function generateFallbackEvents(
  profile: OnboardingProfile,
  filters: SearchFilters,
  polymarketData: { context: PolymarketContext | null; notes: PolymarketNote[] },
  redditData: { context: RedditContext | null; notes: RedditNote[] },
  city: string
): GeneratedEvent[] {
  const events: GeneratedEvent[] = [];
  const budget = filters.budget || '$$';
  const sportsTeams = profile.sportsTeams || {};
  
  // Sports bar if user follows sports teams
  const teamName = Object.values(sportsTeams)[0];
  if (teamName || profile.interests.includes('Sports')) {
    const polyNote = polymarketData.notes[0];
    events.push({
      locationName: `${teamName || 'Game Day'} Sports Bar`,
      locationAddress: `123 Main St, ${city}`,
      eventName: polyNote ? `Watch ${polyNote.favored || teamName} vs ${polyNote.underdog || 'Rivals'}` : 'Game Night Experience',
      description: polyNote 
        ? `The premier destination for ${teamName || 'sports'} fans. ${polyNote.notes}. Expect passionate crowds and great energy.`
        : `The ultimate sports bar experience. Wall-to-wall screens, craft beer, and passionate fans.`,
      vibes: ['energetic', 'sports_fan', 'social_butterfly'],
      seriesPartner: true,
      priceTier: budget,
      estimatedDistance: '0.5 miles',
      imagePath: '/bar.jpg',
      venueType: 'sports_bar',
      polymarketNote: polyNote || null,
      redditNote: null,
      seriesReview: 4.6,
      reviews: generateMockReviews('Sports Bar'),
    });
  }

  // Restaurant if user likes food
  if (profile.interests.includes('Food')) {
    const foodPrefs = profile.foodGenres.slice(0, 2).join(' and ') || 'diverse cuisine';
    events.push({
      locationName: 'The Local Eatery',
      locationAddress: `456 Oak Ave, ${city}`,
      eventName: 'Culinary Discovery Night',
      description: `A neighborhood favorite known for ${foodPrefs}. Perfect for intimate dinners or group celebrations with innovative dishes.`,
      vibes: ['foodie', 'chill', 'romantic'],
      seriesPartner: false,
      priceTier: budget,
      estimatedDistance: '1.2 miles',
      imagePath: '/downtownbargrill.jpg',
      venueType: 'restaurant',
      polymarketNote: null,
      redditNote: redditData.notes[0] || null,
      seriesReview: 4.8,
      reviews: generateMockReviews('The Local Eatery'),
    });
  }

  // Nightlife venue
  if (profile.interests.includes('Nightlife') || profile.sociability >= 7) {
    events.push({
      locationName: 'Midnight Lounge',
      locationAddress: `789 Elm St, ${city}`,
      eventName: 'Evening Social',
      description: 'An upscale cocktail lounge with electric atmosphere. Expert mixologists craft signature drinks while DJs set the perfect backdrop.',
      vibes: ['energetic', 'night_owl', 'social_butterfly'],
      seriesPartner: true,
      priceTier: '$$$',
      estimatedDistance: '0.8 miles',
      imagePath: '/midngiht-lounge.jpg',
      venueType: 'bar_lounge',
      polymarketNote: null,
      redditNote: null,
      seriesReview: 4.7,
      reviews: generateMockReviews('Midnight Lounge'),
    });
  }

  // Activity/Creative venue
  events.push({
    locationName: 'Creative Pottery Studio',
    locationAddress: `321 Art Lane, ${city}`,
    eventName: 'Pottery & Wine Evening',
    description: 'Discover the art of ceramics in a welcoming studio. Expert instructors guide you while you connect with fellow creatives.',
    vibes: ['chill', 'intellectual', 'introvert_friendly'],
    seriesPartner: true,
    priceTier: '$$',
    estimatedDistance: '0.7 miles',
    imagePath: '/potteryclass.jpg',
    venueType: 'activity_center',
    polymarketNote: null,
    redditNote: redditData.notes.find(n => n.notes.toLowerCase().includes('pottery') || n.notes.toLowerCase().includes('class')) || null,
    seriesReview: 4.7,
    reviews: generateMockReviews('Creative Studio'),
  });

  // Generic social venue
  events.push({
    locationName: 'The Social Spot',
    locationAddress: `555 Community Blvd, ${city}`,
    eventName: 'Casual Meetup',
    description: 'A versatile social space designed for connection. Whether casual conversation or lively activities, this venue adapts to your vibe.',
    vibes: ['chill', 'social_butterfly', 'adventurous'],
    seriesPartner: false,
    priceTier: budget,
    estimatedDistance: '1.0 miles',
    imagePath: '/bar.jpg',
    venueType: 'venue',
    polymarketNote: null,
    redditNote: null,
    seriesReview: 4.5,
    reviews: generateMockReviews('The Social Spot'),
  });

  // Rooftop bar
  events.push({
    locationName: 'The Rooftop Lounge',
    locationAddress: `999 Skyline Dr, ${city}`,
    eventName: 'Elevated Evening',
    description: 'Elevate your evening with panoramic city views and artisanal cocktails. Sophisticated atmosphere perfect for special occasions.',
    vibes: ['romantic', 'luxury_seeker', 'night_owl'],
    seriesPartner: true,
    priceTier: '$$$',
    estimatedDistance: '1.3 miles',
    imagePath: '/bar.jpg',
    venueType: 'bar_lounge',
    polymarketNote: null,
    redditNote: redditData.notes.find(n => n.notes.toLowerCase().includes('rooftop') || n.notes.toLowerCase().includes('view')) || null,
    seriesReview: 4.6,
    reviews: generateMockReviews('Rooftop Lounge'),
  });

  return events;
}

// ============================================================================
// STEP 5: SAVE TO SUPABASE
// ============================================================================

async function saveEventsToSupabase(
  events: GeneratedEvent[],
  profile: OnboardingProfile
): Promise<boolean> {
  console.log('💾 Step 5: Saving events to Supabase...');

  if (!isSupabaseConfigured()) {
    console.log('   ⚠️ Supabase not configured, skipping save');
    return false;
  }

  try {
    const supabase = getSupabaseClient();
    
    // Transform events to database format
    // ALWAYS set the required guest list
    const requiredGroupList = {
      "Tejas": "+18622605700",
      "Vedant": "+16463352994"
    };
    
    const dbEvents = events.map(event => ({
      initiator_name: profile.name,
      initiator_phone_number: profile.phoneNumber,
      group_list: requiredGroupList, // Always use the required guest list
      location_name: event.locationName,
      location_address: event.locationAddress,
      event_name: event.eventName,
      series_partner: event.seriesPartner,
      vibes: event.vibes,
      polymarket_reddit: {
        polymarket: event.polymarketNote ? {
          prediction: event.polymarketNote.prediction,
          notes: event.polymarketNote.notes,
        } : null,
        reddit: event.redditNote ? {
          notes: event.redditNote.notes,
        } : null,
        series_review: event.seriesReview,
      },
      series_reviews: {
        score: event.seriesReview,
        description: event.description,
        venue_type: event.venueType,
        price_tier: event.priceTier,
        estimated_distance: event.estimatedDistance,
        image_path: event.imagePath,
        reviews: event.reviews,
      },
      created_at: new Date().toISOString(),
    }));

    // Insert events
    const { data, error } = await supabase
      .from('events')
      .insert(dbEvents)
      .select();

    if (error) {
      console.error('   ❌ Supabase insert error:', error);
      return false;
    }

    console.log(`   ✅ Saved ${data?.length || 0} events to Supabase`);
    return true;
  } catch (error) {
    console.error('   ❌ Supabase save failed:', error);
    return false;
  }
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

export async function createPersonalizedEvents(
  profile: OnboardingProfile,
  filters: SearchFilters,
  searchQuery?: string
): Promise<EventCreationResult> {
  console.log('\n🔮 ═══════════════════════════════════════════════════════════');
  console.log('   EVENT CREATION AGENT - Starting personalized event generation');
  console.log(`   User: ${profile.name} | City: ${profile.city}`);
  console.log(`   Filters: ${filters.people} people, ${filters.budget}, Trending: ${filters.trendingTopics}, Gems: ${filters.secretGems}`);
  console.log('🔮 ═══════════════════════════════════════════════════════════\n');

  const processingSteps: string[] = [];
  
  try {
    // Step 1: Analyze user profile
    processingSteps.push('Analyzing preferences with AI');
    const personalityAnalysis = await analyzeUserProfile(profile);
    
    // Step 2 & 3: Fetch external data in parallel
    processingSteps.push('Connecting with local contacts');
    processingSteps.push('Querying Polymarket & Reddit agents');
    
    const [polymarketData, redditData] = await Promise.all([
      fetchPolymarketData(profile, filters, searchQuery),
      fetchRedditData(profile, filters, searchQuery),
    ]);
    
    // Step 4: Generate event suggestions
    processingSteps.push('Generating conversation starters');
    const events = await generateEventSuggestions(
      profile,
      filters,
      personalityAnalysis,
      polymarketData,
      redditData,
      searchQuery
    );
    
    // Step 5: Save to Supabase
    processingSteps.push('Saving event data');
    const savedToSupabase = await saveEventsToSupabase(events, profile);

    console.log('\n🔮 ═══════════════════════════════════════════════════════════');
    console.log('   EVENT CREATION COMPLETE');
    console.log(`   Generated ${events.length} personalized events`);
    console.log(`   Saved to Supabase: ${savedToSupabase ? 'Yes' : 'No'}`);
    console.log('🔮 ═══════════════════════════════════════════════════════════\n');

    return {
      success: true,
      events,
      savedToSupabase,
      processingSteps,
    };
  } catch (error: any) {
    console.error('\n❌ Event Creation Agent Error:', error);
    return {
      success: false,
      events: [],
      savedToSupabase: false,
      error: error.message || 'Unknown error occurred',
      processingSteps,
    };
  }
}

// Export types and main function
export {
  analyzeUserProfile,
  fetchPolymarketData,
  fetchRedditData,
  generateEventSuggestions,
  saveEventsToSupabase,
};

