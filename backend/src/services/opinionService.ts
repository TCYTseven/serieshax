/**
 * Opinion Service
 * Handles Micro-opinions + sentiment analysis
 */

import { getSupabaseClient } from '../config/supabase';
import { 
  MicroOpinion, 
  CreateOpinionInput,
  SentimentType
} from '../types/database';

/**
 * Sentiment score mapping
 */
const SENTIMENT_SCORES: Record<SentimentType, number> = {
  'very_negative': -2,
  'negative': -1,
  'neutral': 0,
  'positive': 1,
  'very_positive': 2,
};

/**
 * Record a new micro-opinion
 */
export async function recordOpinion(
  data: CreateOpinionInput
): Promise<MicroOpinion> {
  const supabase = getSupabaseClient();
  
  const { data: opinion, error } = await supabase
    .from('micro_opinions')
    .insert({
      user_id: data.user_id,
      topic: data.topic.toLowerCase().trim(),
      city: data.city.toLowerCase().trim(),
      sentiment: data.sentiment,
      intensity: Math.max(1, Math.min(5, data.intensity)), // Clamp 1-5
      raw_text: data.raw_text,
      polymarket_context: data.polymarket_context || null,
      reddit_context: data.reddit_context || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record opinion: ${error.message}`);
  }

  console.log(`✅ Recorded opinion on "${data.topic}" in ${data.city}: ${data.sentiment}`);
  
  // Update city vibe asynchronously
  updateCityVibeFromOpinion(data.city, data.topic, data.sentiment, data.intensity)
    .catch(err => console.error('Error updating city vibe:', err));

  return opinion;
}

/**
 * Get opinions for a topic in a city
 */
export async function getOpinionsForTopic(
  city: string,
  topic: string,
  limit: number = 50
): Promise<MicroOpinion[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('micro_opinions')
    .select('*')
    .ilike('city', `%${city}%`)
    .ilike('topic', `%${topic}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get opinions: ${error.message}`);
  }

  return data || [];
}

/**
 * Get user's opinions
 */
export async function getUserOpinions(
  userId: string,
  limit: number = 20
): Promise<MicroOpinion[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('micro_opinions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get user opinions: ${error.message}`);
  }

  return data || [];
}

/**
 * Aggregate sentiment for a topic in a city
 */
export async function aggregateSentiment(
  city: string,
  topic: string
): Promise<{
  avgSentiment: number;
  avgIntensity: number;
  opinionCount: number;
  distribution: Record<SentimentType, number>;
}> {
  const supabase = getSupabaseClient();
  
  const { data: opinions, error } = await supabase
    .from('micro_opinions')
    .select('sentiment, intensity')
    .ilike('city', `%${city}%`)
    .ilike('topic', `%${topic}%`);

  if (error) {
    throw new Error(`Failed to aggregate sentiment: ${error.message}`);
  }

  if (!opinions || opinions.length === 0) {
    return {
      avgSentiment: 0,
      avgIntensity: 0,
      opinionCount: 0,
      distribution: {
        'very_negative': 0,
        'negative': 0,
        'neutral': 0,
        'positive': 0,
        'very_positive': 0,
      },
    };
  }

  // Calculate distribution
  const distribution: Record<SentimentType, number> = {
    'very_negative': 0,
    'negative': 0,
    'neutral': 0,
    'positive': 0,
    'very_positive': 0,
  };

  let totalSentiment = 0;
  let totalIntensity = 0;

  for (const opinion of opinions) {
    distribution[opinion.sentiment as SentimentType]++;
    totalSentiment += SENTIMENT_SCORES[opinion.sentiment as SentimentType] * opinion.intensity;
    totalIntensity += opinion.intensity;
  }

  const opinionCount = opinions.length;
  const avgSentiment = totalSentiment / (opinionCount * 5); // Normalize to -1 to 1
  const avgIntensity = totalIntensity / opinionCount;

  return {
    avgSentiment: Math.round(avgSentiment * 100) / 100,
    avgIntensity: Math.round(avgIntensity * 100) / 100,
    opinionCount,
    distribution,
  };
}

/**
 * Update city vibe based on new opinion
 */
async function updateCityVibeFromOpinion(
  city: string,
  topic: string,
  sentiment: SentimentType,
  intensity: number
): Promise<void> {
  const supabase = getSupabaseClient();
  
  const normalizedCity = city.toLowerCase().trim();
  const normalizedTopic = topic.toLowerCase().trim();
  
  // Get or create city vibe
  const { data: existing } = await supabase
    .from('city_vibes')
    .select('*')
    .eq('city', normalizedCity)
    .eq('topic', normalizedTopic)
    .single();

  const sentimentScore = SENTIMENT_SCORES[sentiment] * intensity;

  if (existing) {
    // Update existing
    const newCount = existing.opinion_count + 1;
    const newAvg = ((existing.avg_sentiment * existing.opinion_count) + sentimentScore) / newCount;
    
    // Trending score decays but increases with new opinions
    const trendingScore = Math.min(100, existing.trending_score * 0.95 + 5);

    await supabase
      .from('city_vibes')
      .update({
        avg_sentiment: Math.round(newAvg * 100) / 100,
        opinion_count: newCount,
        trending_score: Math.round(trendingScore * 100) / 100,
        last_updated: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    // Create new
    await supabase
      .from('city_vibes')
      .insert({
        city: normalizedCity,
        topic: normalizedTopic,
        avg_sentiment: sentimentScore,
        opinion_count: 1,
        trending_score: 10, // Initial trending score
      });
  }
}

/**
 * Get recent opinions across all topics in a city
 */
export async function getRecentCityOpinions(
  city: string,
  limit: number = 20
): Promise<MicroOpinion[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('micro_opinions')
    .select('*')
    .ilike('city', `%${city}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get recent opinions: ${error.message}`);
  }

  return data || [];
}

/**
 * Get opinions with Polymarket context
 */
export async function getOpinionsWithPolymarket(
  city: string,
  limit: number = 20
): Promise<MicroOpinion[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('micro_opinions')
    .select('*')
    .ilike('city', `%${city}%`)
    .not('polymarket_context', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get Polymarket opinions: ${error.message}`);
  }

  return data || [];
}

/**
 * Get opinions with Reddit context
 */
export async function getOpinionsWithReddit(
  city: string,
  limit: number = 20
): Promise<MicroOpinion[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('micro_opinions')
    .select('*')
    .ilike('city', `%${city}%`)
    .not('reddit_context', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get Reddit opinions: ${error.message}`);
  }

  return data || [];
}

/**
 * Search opinions by text
 */
export async function searchOpinions(
  query: string,
  city?: string,
  limit: number = 20
): Promise<MicroOpinion[]> {
  const supabase = getSupabaseClient();
  
  let dbQuery = supabase
    .from('micro_opinions')
    .select('*')
    .or(`topic.ilike.%${query}%,raw_text.ilike.%${query}%`);

  if (city) {
    dbQuery = dbQuery.ilike('city', `%${city}%`);
  }

  const { data, error } = await dbQuery
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to search opinions: ${error.message}`);
  }

  return data || [];
}

/**
 * Delete an opinion (by user)
 */
export async function deleteOpinion(
  opinionId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('micro_opinions')
    .delete()
    .eq('id', opinionId)
    .eq('user_id', userId); // Ensure user owns the opinion

  if (error) {
    throw new Error(`Failed to delete opinion: ${error.message}`);
  }
}
