/**
 * Spot Service
 * Handles Series Spots queries and matching
 */

import { getSupabaseClient } from '../config/supabase';
import { 
  SeriesSpot, 
  SpotFilters,
  SpotType,
  BudgetTier
} from '../types/database';

/**
 * Search spots by city and filters
 */
export async function searchSpots(
  city: string,
  filters: SpotFilters = {}
): Promise<SeriesSpot[]> {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from('series_spots')
    .select('*')
    .ilike('city', `%${city}%`);

  // Apply filters
  if (filters.spot_type) {
    query = query.eq('spot_type', filters.spot_type);
  }

  if (filters.budget_tier) {
    query = query.eq('budget_tier', filters.budget_tier);
  }

  if (filters.min_rating) {
    query = query.gte('avg_rating', filters.min_rating);
  }

  if (filters.tags && filters.tags.length > 0) {
    // Match any of the tags using overlap
    query = query.overlaps('tags', filters.tags);
  }

  if (filters.vibe_descriptors && filters.vibe_descriptors.length > 0) {
    query = query.overlaps('vibe_descriptors', filters.vibe_descriptors);
  }

  // Order by rating
  query = query.order('avg_rating', { ascending: false, nullsFirst: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to search spots: ${error.message}`);
  }

  return data || [];
}

/**
 * Get a spot by ID
 */
export async function getSpotById(spotId: string): Promise<SeriesSpot | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('series_spots')
    .select('*')
    .eq('id', spotId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get spot: ${error.message}`);
  }

  return data;
}

/**
 * Get spots by name (fuzzy search)
 */
export async function searchSpotsByName(
  name: string,
  city?: string
): Promise<SeriesSpot[]> {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from('series_spots')
    .select('*')
    .ilike('name', `%${name}%`);

  if (city) {
    query = query.ilike('city', `%${city}%`);
  }

  const { data, error } = await query.limit(10);

  if (error) {
    throw new Error(`Failed to search spots by name: ${error.message}`);
  }

  return data || [];
}

/**
 * Get spots matching user vibes
 */
export async function getSpotsForVibes(
  vibes: string[],
  city: string,
  limit: number = 5
): Promise<SeriesSpot[]> {
  const supabase = getSupabaseClient();
  
  if (!vibes || vibes.length === 0) {
    // Return top-rated spots in the city if no vibes specified
    const { data, error } = await supabase
      .from('series_spots')
      .select('*')
      .ilike('city', `%${city}%`)
      .order('avg_rating', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get spots: ${error.message}`);
    }

    return data || [];
  }

  // Search for spots matching vibes in vibe_descriptors or tags
  const { data, error } = await supabase
    .from('series_spots')
    .select('*')
    .ilike('city', `%${city}%`)
    .or(`vibe_descriptors.ov.{${vibes.join(',')}},tags.ov.{${vibes.join(',')}}`)
    .order('avg_rating', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    // Fallback: try with overlaps separately
    console.warn('Vibe search failed, using fallback:', error);
    return searchSpots(city, { vibe_descriptors: vibes });
  }

  return data || [];
}

/**
 * Get spots by type in a city
 */
export async function getSpotsByType(
  city: string,
  spotType: SpotType,
  limit: number = 10
): Promise<SeriesSpot[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('series_spots')
    .select('*')
    .ilike('city', `%${city}%`)
    .eq('spot_type', spotType)
    .order('avg_rating', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get spots by type: ${error.message}`);
  }

  return data || [];
}

/**
 * Get spots by budget tier
 */
export async function getSpotsByBudget(
  city: string,
  budgetTier: BudgetTier,
  limit: number = 10
): Promise<SeriesSpot[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('series_spots')
    .select('*')
    .ilike('city', `%${city}%`)
    .eq('budget_tier', budgetTier)
    .order('avg_rating', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get spots by budget: ${error.message}`);
  }

  return data || [];
}

/**
 * Get top-rated spots in a city
 */
export async function getTopRatedSpots(
  city: string,
  limit: number = 10
): Promise<SeriesSpot[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('series_spots')
    .select('*')
    .ilike('city', `%${city}%`)
    .not('avg_rating', 'is', null)
    .gte('total_reviews', 5) // At least 5 reviews
    .order('avg_rating', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get top-rated spots: ${error.message}`);
  }

  return data || [];
}

/**
 * Update spot rating after a new review
 */
export async function updateSpotRating(
  spotId: string,
  newRating: number
): Promise<SeriesSpot> {
  const supabase = getSupabaseClient();
  
  // Get current spot
  const spot = await getSpotById(spotId);
  if (!spot) {
    throw new Error(`Spot not found: ${spotId}`);
  }

  // Calculate new average
  const currentAvg = spot.avg_rating || 0;
  const currentCount = spot.total_reviews || 0;
  const newCount = currentCount + 1;
  const newAvg = ((currentAvg * currentCount) + newRating) / newCount;

  const { data, error } = await supabase
    .from('series_spots')
    .update({
      avg_rating: Math.round(newAvg * 100) / 100, // 2 decimal places
      total_reviews: newCount,
    })
    .eq('id', spotId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update spot rating: ${error.message}`);
  }

  console.log(`✅ Updated spot ${spot.name} rating: ${newAvg.toFixed(2)} (${newCount} reviews)`);
  return data;
}

/**
 * Get nearby spots (within a radius, if coordinates are available)
 */
export async function getNearbySpots(
  latitude: number,
  longitude: number,
  radiusKm: number = 5,
  limit: number = 10
): Promise<SeriesSpot[]> {
  const supabase = getSupabaseClient();
  
  // Simple bounding box calculation
  // 1 degree latitude ≈ 111 km
  // 1 degree longitude ≈ 111 km * cos(latitude)
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));

  const { data, error } = await supabase
    .from('series_spots')
    .select('*')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .gte('latitude', latitude - latDelta)
    .lte('latitude', latitude + latDelta)
    .gte('longitude', longitude - lngDelta)
    .lte('longitude', longitude + lngDelta)
    .order('avg_rating', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get nearby spots: ${error.message}`);
  }

  return data || [];
}

/**
 * Create a new spot
 */
export async function createSpot(
  spotData: Omit<SeriesSpot, 'id' | 'avg_rating' | 'total_reviews'>
): Promise<SeriesSpot> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('series_spots')
    .insert({
      ...spotData,
      avg_rating: null,
      total_reviews: 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create spot: ${error.message}`);
  }

  console.log(`✅ Created new spot: ${data.name}`);
  return data;
}
