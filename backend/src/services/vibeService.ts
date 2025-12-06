/**
 * Vibe Service
 * Handles City vibes aggregation and trending topics
 */

import { getSupabaseClient } from '../config/supabase';
import { CityVibe, SentimentType } from '../types/database';

/**
 * Sentiment score mapping for calculations
 */
const SENTIMENT_SCORES: Record<SentimentType, number> = {
  'very_negative': -2,
  'negative': -1,
  'neutral': 0,
  'positive': 1,
  'very_positive': 2,
};

/**
 * Get or create a city vibe for a topic
 */
export async function getCityVibe(
  city: string,
  topic: string
): Promise<CityVibe | null> {
  const supabase = getSupabaseClient();
  
  const normalizedCity = city.toLowerCase().trim();
  const normalizedTopic = topic.toLowerCase().trim();

  const { data, error } = await supabase
    .from('city_vibes')
    .select('*')
    .eq('city', normalizedCity)
    .eq('topic', normalizedTopic)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get city vibe: ${error.message}`);
  }

  return data;
}

/**
 * Get or create a city vibe (creates if doesn't exist)
 */
export async function getOrCreateCityVibe(
  city: string,
  topic: string
): Promise<CityVibe> {
  const existing = await getCityVibe(city, topic);
  if (existing) {
    return existing;
  }

  const supabase = getSupabaseClient();
  const normalizedCity = city.toLowerCase().trim();
  const normalizedTopic = topic.toLowerCase().trim();

  const { data, error } = await supabase
    .from('city_vibes')
    .insert({
      city: normalizedCity,
      topic: normalizedTopic,
      avg_sentiment: 0,
      opinion_count: 0,
      trending_score: 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create city vibe: ${error.message}`);
  }

  return data;
}

/**
 * Update city vibe with new sentiment
 */
export async function updateCityVibe(
  city: string,
  topic: string,
  newSentiment: number,
  intensity: number = 3
): Promise<CityVibe> {
  const supabase = getSupabaseClient();
  
  const normalizedCity = city.toLowerCase().trim();
  const normalizedTopic = topic.toLowerCase().trim();
  
  // Get current vibe
  let currentVibe = await getCityVibe(city, topic);
  
  if (!currentVibe) {
    // Create new vibe
    const { data, error } = await supabase
      .from('city_vibes')
      .insert({
        city: normalizedCity,
        topic: normalizedTopic,
        avg_sentiment: newSentiment * intensity,
        opinion_count: 1,
        trending_score: 10,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create city vibe: ${error.message}`);
    }

    return data;
  }

  // Update existing vibe
  const weightedSentiment = newSentiment * intensity;
  const newCount = currentVibe.opinion_count + 1;
  const newAvg = ((currentVibe.avg_sentiment * currentVibe.opinion_count) + weightedSentiment) / newCount;
  
  // Trending score: increases with activity, decays over time
  const timeSinceUpdate = Date.now() - new Date(currentVibe.last_updated).getTime();
  const hoursSinceUpdate = timeSinceUpdate / (1000 * 60 * 60);
  const decayFactor = Math.max(0.5, 1 - (hoursSinceUpdate * 0.01)); // Decay ~1% per hour
  const newTrending = Math.min(100, (currentVibe.trending_score * decayFactor) + (intensity * 2));

  const { data, error } = await supabase
    .from('city_vibes')
    .update({
      avg_sentiment: Math.round(newAvg * 100) / 100,
      opinion_count: newCount,
      trending_score: Math.round(newTrending * 100) / 100,
      last_updated: new Date().toISOString(),
    })
    .eq('id', currentVibe.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update city vibe: ${error.message}`);
  }

  console.log(`✅ Updated vibe for "${topic}" in ${city}: sentiment=${newAvg.toFixed(2)}, trending=${newTrending.toFixed(1)}`);
  return data;
}

/**
 * Get trending topics in a city
 */
export async function getTrendingTopics(
  city: string,
  limit: number = 10
): Promise<CityVibe[]> {
  const supabase = getSupabaseClient();
  
  const normalizedCity = city.toLowerCase().trim();

  const { data, error } = await supabase
    .from('city_vibes')
    .select('*')
    .eq('city', normalizedCity)
    .gte('opinion_count', 3) // At least 3 opinions
    .order('trending_score', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get trending topics: ${error.message}`);
  }

  return data || [];
}

/**
 * Get all vibes for a city
 */
export async function getCityVibes(
  city: string,
  limit: number = 50
): Promise<CityVibe[]> {
  const supabase = getSupabaseClient();
  
  const normalizedCity = city.toLowerCase().trim();

  const { data, error } = await supabase
    .from('city_vibes')
    .select('*')
    .eq('city', normalizedCity)
    .order('opinion_count', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get city vibes: ${error.message}`);
  }

  return data || [];
}

/**
 * Get positive vibes (positive sentiment topics)
 */
export async function getPositiveVibes(
  city: string,
  limit: number = 10
): Promise<CityVibe[]> {
  const supabase = getSupabaseClient();
  
  const normalizedCity = city.toLowerCase().trim();

  const { data, error } = await supabase
    .from('city_vibes')
    .select('*')
    .eq('city', normalizedCity)
    .gt('avg_sentiment', 0)
    .gte('opinion_count', 2)
    .order('avg_sentiment', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get positive vibes: ${error.message}`);
  }

  return data || [];
}

/**
 * Get negative vibes (negative sentiment topics)
 */
export async function getNegativeVibes(
  city: string,
  limit: number = 10
): Promise<CityVibe[]> {
  const supabase = getSupabaseClient();
  
  const normalizedCity = city.toLowerCase().trim();

  const { data, error } = await supabase
    .from('city_vibes')
    .select('*')
    .eq('city', normalizedCity)
    .lt('avg_sentiment', 0)
    .gte('opinion_count', 2)
    .order('avg_sentiment', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get negative vibes: ${error.message}`);
  }

  return data || [];
}

/**
 * Get controversial topics (high opinion count, mixed sentiment)
 */
export async function getControversialTopics(
  city: string,
  limit: number = 10
): Promise<CityVibe[]> {
  const supabase = getSupabaseClient();
  
  const normalizedCity = city.toLowerCase().trim();

  // Controversial = high opinion count but sentiment close to neutral
  const { data, error } = await supabase
    .from('city_vibes')
    .select('*')
    .eq('city', normalizedCity)
    .gte('opinion_count', 5)
    .gte('avg_sentiment', -1)
    .lte('avg_sentiment', 1)
    .order('opinion_count', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get controversial topics: ${error.message}`);
  }

  return data || [];
}

/**
 * Search vibes by topic
 */
export async function searchVibes(
  query: string,
  city?: string,
  limit: number = 20
): Promise<CityVibe[]> {
  const supabase = getSupabaseClient();
  
  let dbQuery = supabase
    .from('city_vibes')
    .select('*')
    .ilike('topic', `%${query}%`);

  if (city) {
    dbQuery = dbQuery.eq('city', city.toLowerCase().trim());
  }

  const { data, error } = await dbQuery
    .order('trending_score', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to search vibes: ${error.message}`);
  }

  return data || [];
}

/**
 * Decay trending scores (run periodically)
 */
export async function decayTrendingScores(): Promise<number> {
  const supabase = getSupabaseClient();
  
  // Get all vibes that haven't been updated in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data: staleVibes, error: fetchError } = await supabase
    .from('city_vibes')
    .select('id, trending_score')
    .lt('last_updated', oneHourAgo)
    .gt('trending_score', 0);

  if (fetchError) {
    throw new Error(`Failed to fetch stale vibes: ${fetchError.message}`);
  }

  if (!staleVibes || staleVibes.length === 0) {
    return 0;
  }

  // Decay each by 5%
  let updated = 0;
  for (const vibe of staleVibes) {
    const newScore = Math.max(0, vibe.trending_score * 0.95);
    
    const { error: updateError } = await supabase
      .from('city_vibes')
      .update({ trending_score: Math.round(newScore * 100) / 100 })
      .eq('id', vibe.id);

    if (!updateError) {
      updated++;
    }
  }

  if (updated > 0) {
    console.log(`🔄 Decayed trending scores for ${updated} vibes`);
  }

  return updated;
}

/**
 * Get sentiment summary for a city
 */
export async function getCitySentimentSummary(city: string): Promise<{
  totalTopics: number;
  avgSentiment: number;
  totalOpinions: number;
  topPositive: CityVibe[];
  topNegative: CityVibe[];
  trending: CityVibe[];
}> {
  const [allVibes, positive, negative, trending] = await Promise.all([
    getCityVibes(city, 100),
    getPositiveVibes(city, 3),
    getNegativeVibes(city, 3),
    getTrendingTopics(city, 5),
  ]);

  const totalTopics = allVibes.length;
  const totalOpinions = allVibes.reduce((sum, v) => sum + v.opinion_count, 0);
  const avgSentiment = totalTopics > 0
    ? allVibes.reduce((sum, v) => sum + v.avg_sentiment, 0) / totalTopics
    : 0;

  return {
    totalTopics,
    avgSentiment: Math.round(avgSentiment * 100) / 100,
    totalOpinions,
    topPositive: positive,
    topNegative: negative,
    trending,
  };
}
