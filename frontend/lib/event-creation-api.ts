/**
 * Event Creation API Client
 * 
 * Handles communication with the backend Event Creation Agent
 */

import { OnboardingData } from "@/contexts/OnboardingContext";

// ============================================================================
// TYPES
// ============================================================================

export interface SearchFilters {
  people: string;
  location: string;
  budget: string;
  trendingTopics: boolean;
  secretGems: boolean;
}

export interface PolymarketNote {
  prediction: string;
  notes: string;
}

export interface RedditNote {
  notes: string;
}

export interface EventReview {
  user: string;
  rating: number;
  text: string;
  date: string;
}

export interface GeneratedEvent {
  id?: number;
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
  reviews: EventReview[];
}

export interface CreateEventResponse {
  success: boolean;
  events?: GeneratedEvent[];
  savedToSupabase?: boolean;
  error?: string;
  processingSteps?: string[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Transform OnboardingData to API format
 */
function transformOnboardingToProfile(data: OnboardingData) {
  // Extract city from location (e.g., "New York, United States" -> "New York")
  const city = data.location ? data.location.split(',')[0].trim() : 'New York';
  
  return {
    name: data.name,
    phoneNumber: data.phoneNumber,
    city: city,
    interests: data.interests,
    goals: data.goals,
    sportsTeams: data.sportsTeams,
    foodGenres: data.foodGenres,
    musicGenres: data.musicGenres,
    sociability: data.socialbility, // Note: typo in original context
    vibeTags: data.vibeTags,
    age: data.age,
  };
}

/**
 * Create personalized events using the backend Event Creation Agent
 */
export async function createPersonalizedEvents(
  onboardingData: OnboardingData,
  filters: SearchFilters,
  searchQuery?: string
): Promise<CreateEventResponse> {
  try {
    console.log('🔮 Calling Event Creation Agent...');
    console.log(`   API URL: ${API_BASE_URL}/api/events/create`);
    console.log('   Profile data:', onboardingData);
    console.log('   Filters:', filters);
    
    const profile = transformOnboardingToProfile(onboardingData);
    console.log('   Transformed profile:', profile);
    
    const requestBody = {
      profile,
      filters,
      searchQuery,
    };
    console.log('   Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${API_BASE_URL}/api/events/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('   Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const result: CreateEventResponse = await response.json();
    console.log(`   ✅ Received ${result.events?.length || 0} events from API`);
    console.log('   Events:', result.events);
    
    return result;
  } catch (error: any) {
    console.error('❌ Event Creation API Error:', error);
    console.error('   Error details:', error.message);
    
    // Return fallback response
    return {
      success: false,
      error: error.message || 'Failed to connect to backend',
      events: [],
    };
  }
}

/**
 * Check if the backend API is available
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Test the Event Creation Agent with mock data
 */
export async function testEventCreation(): Promise<CreateEventResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/events/test`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    console.error('❌ Test API Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to connect to backend',
      events: [],
    };
  }
}

// ============================================================================
// FALLBACK EVENT GENERATION (Client-side)
// ============================================================================

/**
 * Generate fallback events when backend is unavailable
 * This mirrors the backend logic for offline/error scenarios
 */
export function generateFallbackEvents(
  onboardingData: OnboardingData,
  filters: SearchFilters
): GeneratedEvent[] {
  const events: GeneratedEvent[] = [];
  const budget = filters.budget || '$$';
  const sportsTeams = onboardingData.sportsTeams || {};
  const city = filters.location || onboardingData.location?.split(',')[0].trim() || 'New York';
  
  // Sports bar if user follows sports teams
  const teamName = Object.values(sportsTeams)[0];
  if (teamName || onboardingData.interests.includes('Sports')) {
    events.push({
      id: 1,
      locationName: 'Barclays Center Sports Bar',
      locationAddress: `123 Main St, ${city}`,
      eventName: `Watch ${teamName || 'Game Night'}`,
      description: `The premier destination for ${teamName || 'sports'} fans. With prediction markets showing exciting odds tonight, expect passionate crowds and great energy.`,
      vibes: ['energetic', 'sports_fan', 'social_butterfly'],
      seriesPartner: true,
      priceTier: budget,
      estimatedDistance: '0.5 miles',
      imagePath: '/bar.jpg',
      venueType: 'sports_bar',
      polymarketNote: filters.trendingTopics ? {
        prediction: `${teamName || 'Local team'} game`,
        notes: 'Polymarket shows significant betting activity for tonight\'s matchup',
      } : null,
      redditNote: filters.secretGems ? {
        notes: 'Reddit users consistently recommend this spot as a hidden gem for authentic game-day experiences',
      } : null,
      seriesReview: 4.6,
      reviews: [
        { user: 'Alex M.', rating: 5, text: 'Amazing atmosphere! The staff is super friendly.', date: '2 days ago' },
        { user: 'Sarah K.', rating: 5, text: 'Best sports bar in the area. Highly recommend!', date: '1 week ago' },
      ],
    });
  }

  // Restaurant
  if (onboardingData.interests.includes('Food')) {
    events.push({
      id: 2,
      locationName: 'The Local Eatery',
      locationAddress: `456 Oak Ave, ${city}`,
      eventName: 'Culinary Discovery Night',
      description: 'A neighborhood favorite known for innovative cuisine. Perfect for intimate dinners or group celebrations.',
      vibes: ['foodie', 'chill', 'romantic'],
      seriesPartner: false,
      priceTier: budget,
      estimatedDistance: '1.2 miles',
      imagePath: '/downtownbargrill.jpg',
      venueType: 'restaurant',
      polymarketNote: null,
      redditNote: filters.secretGems ? {
        notes: 'Frequently mentioned on Reddit as an underrated culinary destination',
      } : null,
      seriesReview: 4.8,
      reviews: [
        { user: 'Emma L.', rating: 5, text: 'Incredible food and service! Perfect atmosphere.', date: '3 days ago' },
      ],
    });
  }

  // Nightlife
  if (onboardingData.interests.includes('Nightlife') || onboardingData.socialbility >= 7) {
    events.push({
      id: 3,
      locationName: 'Midnight Lounge',
      locationAddress: `789 Elm St, ${city}`,
      eventName: 'Evening Social',
      description: 'An upscale cocktail lounge with electric atmosphere. Expert mixologists craft signature drinks.',
      vibes: ['energetic', 'night_owl', 'social_butterfly'],
      seriesPartner: true,
      priceTier: '$$$',
      estimatedDistance: '0.8 miles',
      imagePath: '/midngiht-lounge.jpg',
      venueType: 'bar_lounge',
      polymarketNote: null,
      redditNote: null,
      seriesReview: 4.7,
      reviews: [
        { user: 'Jessica P.', rating: 5, text: 'Love this place! Met so many cool people here.', date: '1 day ago' },
      ],
    });
  }

  // Activity venue
  events.push({
    id: 4,
    locationName: 'Creative Pottery Studio',
    locationAddress: `321 Art Lane, ${city}`,
    eventName: 'Pottery & Wine Evening',
    description: 'Discover the art of ceramics in a welcoming studio. Expert instructors guide you while connecting with fellow creatives.',
    vibes: ['chill', 'intellectual', 'introvert_friendly'],
    seriesPartner: true,
    priceTier: '$$',
    estimatedDistance: '0.7 miles',
    imagePath: '/potteryclass.jpg',
    venueType: 'activity_center',
    polymarketNote: null,
    redditNote: filters.secretGems ? {
      notes: 'Reddit community consistently recommends this studio for its exceptional instruction',
    } : null,
    seriesReview: 4.7,
    reviews: [
      { user: 'Maya K.', rating: 5, text: 'Such a fun experience! Met some great people.', date: '4 days ago' },
    ],
  });

  // Social spot
  events.push({
    id: 5,
    locationName: 'The Social Spot',
    locationAddress: `555 Community Blvd, ${city}`,
    eventName: 'Casual Meetup',
    description: 'A versatile social space designed for connection. Adapts to your vibe perfectly.',
    vibes: ['chill', 'social_butterfly', 'adventurous'],
    seriesPartner: false,
    priceTier: budget,
    estimatedDistance: '1.0 miles',
    imagePath: '/bar.jpg',
    venueType: 'venue',
    polymarketNote: null,
    redditNote: null,
    seriesReview: 4.5,
    reviews: [
      { user: 'Taylor S.', rating: 4, text: 'Nice place with good vibes!', date: '1 week ago' },
    ],
  });

  // Rooftop
  events.push({
    id: 6,
    locationName: 'The Rooftop Lounge',
    locationAddress: `999 Skyline Dr, ${city}`,
    eventName: 'Elevated Evening',
    description: 'Elevate your evening with panoramic city views and artisanal cocktails. Sophisticated atmosphere.',
    vibes: ['romantic', 'luxury_seeker', 'night_owl'],
    seriesPartner: true,
    priceTier: '$$$',
    estimatedDistance: '1.3 miles',
    imagePath: '/bar.jpg',
    venueType: 'bar_lounge',
    polymarketNote: null,
    redditNote: filters.secretGems ? {
      notes: 'Reddit users highlight this as one of the city\'s best-kept secrets',
    } : null,
    seriesReview: 4.6,
    reviews: [
      { user: 'Olivia R.', rating: 5, text: 'Beautiful views and amazing cocktails!', date: '3 days ago' },
    ],
  });

  return events;
}

