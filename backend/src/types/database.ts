/**
 * Database Types for Social Oracle
 * Matches the Supabase schema from Phase 2
 */

// ============================================================================
// ENUMS
// ============================================================================

export type UserIntent = 
  | 'meet'
  | 'drink'
  | 'learn'
  | 'explore'
  | 'general';

export type VibeTag = 
  | 'chill'
  | 'energetic'
  | 'romantic'
  | 'adventurous'
  | 'intellectual'
  | 'social_butterfly'
  | 'introvert_friendly'
  | 'sports_fan'
  | 'foodie'
  | 'night_owl'
  | 'early_bird'
  | 'budget_conscious'
  | 'luxury_seeker';

export type MeetupStatus = 
  | 'proposed'
  | 'pending_confirmations'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type SpotType = 
  | 'sports_bar'
  | 'restaurant'
  | 'bar_lounge'
  | 'cafe'
  | 'venue'
  | 'activity_center'
  | 'outdoor_space';

export type SentimentType = 
  | 'very_negative'
  | 'negative'
  | 'neutral'
  | 'positive'
  | 'very_positive';

export type BudgetTier = 
  | 'budget'
  | 'moderate'
  | 'upscale'
  | 'luxury';

export type SocialAnxietyLevel = 
  | 'none'
  | 'mild'
  | 'moderate'
  | 'high';

// ============================================================================
// TABLE TYPES
// ============================================================================

export interface User {
  id: string;
  series_user_id: string | null;
  phone_number: string;
  created_at: string;
  updated_at: string;
  last_active_at: string;
  is_active: boolean;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  age: number | null;
  city: string | null;
  interests: string[];
  goals: string[];
  sports_teams: Record<string, string[]> | null;
  food_genres: string[];
  music_genres: string[];
  vibe_tags: VibeTag[];
  social_anxiety: SocialAnxietyLevel;
  group_size_preference: number | null;
  preferred_budget: BudgetTier;
  total_meetups_attended: number;
  avg_rating_given: number | null;
  avg_rating_received: number | null;
}

export interface SeriesSpot {
  id: string;
  name: string;
  description: string | null;
  city: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  spot_type: SpotType;
  tags: string[];
  budget_tier: BudgetTier;
  image_url: string | null;
  avg_rating: number | null;
  total_reviews: number;
  vibe_descriptors: string[];
}

export interface Meetup {
  id: string;
  initiator_id: string;
  spot_id: string | null;
  title: string;
  description: string | null;
  intent: string | null;
  scheduled_time: string;
  max_participants: number;
  status: MeetupStatus;
  search_query: string | null;
  search_filters: Record<string, unknown> | null;
  oracle_reasoning: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface MeetupParticipant {
  id: string;
  meetup_id: string;
  user_id: string;
  joined_at: string;
  confirmed_at: string | null;
  attended: boolean | null;
}

export interface MicroOpinion {
  id: string;
  user_id: string;
  topic: string;
  city: string;
  sentiment: SentimentType;
  intensity: number;
  raw_text: string;
  polymarket_context: Record<string, unknown> | null;
  reddit_context: Record<string, unknown> | null;
  created_at: string;
}

export interface HangoutReview {
  id: string;
  user_id: string;
  meetup_id: string;
  spot_id: string | null;
  rating: number;
  text: string | null;
  vibe_tags: VibeTag[];
  created_at: string;
}

export interface CityVibe {
  id: string;
  city: string;
  topic: string;
  avg_sentiment: number;
  opinion_count: number;
  trending_score: number;
  last_updated: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  series_conversation_id: string | null;
  started_at: string;
  last_message_at: string;
  current_intent: UserIntent;
  context_data: Record<string, unknown> | null;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  oracle_response: Record<string, unknown> | null;
  kafka_events_emitted: string[];
  created_at: string;
}

export interface Reflection {
  id: string;
  user_id: string;
  raw_reflection: string;
  analysis: string | null;
  follow_up_questions: string[] | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// INPUT TYPES (for creating/updating)
// ============================================================================

export interface CreateUserInput {
  phone_number: string;
  series_user_id?: string;
}

export interface UpdateProfileInput {
  display_name?: string;
  age?: number;
  city?: string;
  interests?: string[];
  goals?: string[];
  sports_teams?: Record<string, string[]>;
  food_genres?: string[];
  music_genres?: string[];
  vibe_tags?: VibeTag[];
  social_anxiety?: SocialAnxietyLevel;
  group_size_preference?: number;
  preferred_budget?: BudgetTier;
}

export interface SpotFilters {
  spot_type?: SpotType;
  budget_tier?: BudgetTier;
  tags?: string[];
  vibe_descriptors?: string[];
  min_rating?: number;
}

export interface CreateMeetupInput {
  spot_id?: string;
  title: string;
  description?: string;
  intent?: string;
  scheduled_time: string;
  max_participants?: number;
  search_query?: string;
  search_filters?: Record<string, unknown>;
  oracle_reasoning?: Record<string, unknown>;
}

export interface CreateOpinionInput {
  user_id: string;
  topic: string;
  city: string;
  sentiment: SentimentType;
  intensity: number;
  raw_text: string;
  polymarket_context?: Record<string, unknown>;
  reddit_context?: Record<string, unknown>;
}

export interface CreateConversationInput {
  user_id: string;
  series_conversation_id?: string;
  current_intent?: UserIntent;
}

export interface CreateMessageInput {
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  oracle_response?: Record<string, unknown> | null;
  kafka_events_emitted?: string[];
}

export interface CreateReflectionInput {
  user_id: string;
  raw_reflection: string;
}

// ============================================================================
// JOINED TYPES (for queries with relations)
// ============================================================================

export interface UserWithProfile extends User {
  profile: Profile | null;
}

export interface MeetupWithDetails extends Meetup {
  spot: SeriesSpot | null;
  participants: MeetupParticipant[];
  initiator: User;
}

export interface ConversationWithMessages extends Conversation {
  messages: ConversationMessage[];
}
