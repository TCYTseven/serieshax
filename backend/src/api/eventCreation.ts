/**
 * Event Creation API
 * 
 * Express router for the Event Creation Agent
 * Handles the frontend's "Create Event" requests
 */

import express, { Request, Response } from 'express';
import {
  createPersonalizedEvents,
  OnboardingProfile,
  SearchFilters,
  EventCreationResult,
} from '../services/eventCreationAgent';

const router = express.Router();

// ============================================================================
// TYPES
// ============================================================================

interface CreateEventRequest {
  profile: OnboardingProfile;
  filters: SearchFilters;
  searchQuery?: string;
}

interface CreateEventResponse {
  success: boolean;
  events?: Array<{
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
    polymarketNote: {
      prediction: string;
      notes: string;
    } | null;
    redditNote: {
      notes: string;
    } | null;
    seriesReview: number;
    reviews: Array<{
      user: string;
      rating: number;
      text: string;
      date: string;
    }>;
  }>;
  savedToSupabase?: boolean;
  error?: string;
  processingSteps?: string[];
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/events/create
 * 
 * Main endpoint for creating personalized events
 * Called by the frontend during the loading phase
 */
router.post('/create', async (req: Request, res: Response) => {
  console.log('\n📥 Received event creation request');
  
  try {
    const { profile, filters, searchQuery } = req.body as CreateEventRequest;

    // Use default values if profile is missing or incomplete
    const inputProfile = profile || {};
    
    // Extract city from location filter or profile, with NYC as default
    const city = filters?.location || inputProfile.city || 'New York';
    
    // Set default values for all fields - make the API more robust
    const normalizedProfile: OnboardingProfile = {
      name: inputProfile.name || 'Explorer',
      phoneNumber: inputProfile.phoneNumber || '',
      city: city,
      interests: inputProfile.interests?.length > 0 ? inputProfile.interests : ['Nightlife', 'Food'],
      goals: inputProfile.goals || ['Meet new people'],
      sportsTeams: inputProfile.sportsTeams || {},
      foodGenres: inputProfile.foodGenres || [],
      musicGenres: inputProfile.musicGenres || [],
      sociability: inputProfile.sociability || 5,
      vibeTags: inputProfile.vibeTags?.length > 0 ? inputProfile.vibeTags : ['social_butterfly'],
      age: inputProfile.age,
    };

    const normalizedFilters: SearchFilters = {
      people: filters?.people || '1',
      location: filters?.location || profile.city,
      budget: filters?.budget || '$$',
      trendingTopics: filters?.trendingTopics ?? false,
      secretGems: filters?.secretGems ?? false,
    };

    console.log(`   Profile: ${normalizedProfile.name} from ${normalizedProfile.city}`);
    console.log(`   Interests: ${normalizedProfile.interests.join(', ')}`);
    console.log(`   Filters: ${normalizedFilters.people} people, ${normalizedFilters.budget}`);
    console.log(`   Polymarket: ${normalizedFilters.trendingTopics}, Reddit: ${normalizedFilters.secretGems}`);

    // Call the Event Creation Agent
    const result = await createPersonalizedEvents(
      normalizedProfile,
      normalizedFilters,
      searchQuery
    );

    // Transform result for frontend
    const response: CreateEventResponse = {
      success: result.success,
      events: result.events.map((event, index) => ({
        id: index + 1,
        locationName: event.locationName,
        locationAddress: event.locationAddress,
        eventName: event.eventName,
        description: event.description,
        vibes: event.vibes,
        seriesPartner: event.seriesPartner,
        priceTier: event.priceTier,
        estimatedDistance: event.estimatedDistance,
        imagePath: event.imagePath,
        venueType: event.venueType,
        polymarketNote: event.polymarketNote ? {
          prediction: event.polymarketNote.prediction,
          notes: event.polymarketNote.notes,
        } : null,
        redditNote: event.redditNote ? {
          notes: event.redditNote.notes,
        } : null,
        seriesReview: Math.round(event.seriesReview * 10) / 10,
        reviews: event.reviews,
      })),
      savedToSupabase: result.savedToSupabase,
      processingSteps: result.processingSteps,
    };

    if (!result.success) {
      response.error = result.error;
    }

    console.log(`   ✅ Returning ${result.events.length} events`);
    return res.json(response);

  } catch (error: any) {
    console.error('❌ Event creation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    } as CreateEventResponse);
  }
});

/**
 * GET /api/events/health
 * 
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'event-creation-agent',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/events/test
 * 
 * Test endpoint with mock data
 */
router.post('/test', async (req: Request, res: Response) => {
  const mockProfile: OnboardingProfile = {
    name: 'Alex',
    phoneNumber: '1234567890',
    city: 'New York',
    interests: ['Sports', 'Nightlife', 'Food'],
    goals: ['Meet new people', 'Explore the city'],
    sportsTeams: { Basketball: 'Nets', Football: 'Giants' },
    foodGenres: ['Italian', 'Japanese'],
    musicGenres: ['Hip Hop', 'Electronic'],
    sociability: 8,
    vibeTags: ['energetic', 'social_butterfly'],
    age: '28',
  };

  const mockFilters: SearchFilters = {
    people: '4',
    location: 'Brooklyn',
    budget: '$$',
    trendingTopics: true,
    secretGems: true,
  };

  const result = await createPersonalizedEvents(mockProfile, mockFilters, 'sports bar');
  
  res.json({
    success: result.success,
    events: result.events,
    savedToSupabase: result.savedToSupabase,
    processingSteps: result.processingSteps,
    error: result.error,
  });
});

export default router;

