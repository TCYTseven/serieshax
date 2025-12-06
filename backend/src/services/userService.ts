/**
 * User Service
 * Handles User + Profile CRUD operations
 */

import { getSupabaseClient } from '../config/supabase';
import { 
  User, 
  Profile, 
  UserWithProfile, 
  UpdateProfileInput,
  VibeTag 
} from '../types/database';

/**
 * Get or create a user by phone number
 * Creates a new user if one doesn't exist with the given phone number
 */
export async function getOrCreateUser(
  phoneNumber: string, 
  seriesUserId?: string
): Promise<User> {
  const supabase = getSupabaseClient();
  
  // First, try to find existing user by phone number
  const { data: existingUser, error: findError } = await supabase
    .from('users')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single();

  if (existingUser && !findError) {
    // Update last_active_at
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        last_active_at: new Date().toISOString(),
        series_user_id: seriesUserId || existingUser.series_user_id
      })
      .eq('id', existingUser.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating user last_active_at:', updateError);
      return existingUser;
    }
    
    return updatedUser;
  }

  // Create new user
  // Generate a series_user_id if not provided (required field)
  const generatedSeriesId = seriesUserId || `series_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      phone_number: phoneNumber,
      series_user_id: generatedSeriesId,
      is_active: true,
    })
    .select()
    .single();

  if (createError) {
    throw new Error(`Failed to create user: ${createError.message}`);
  }

  // Create default profile for new user
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: newUser.id,
      interests: [],
      goals: [],
      food_genres: [],
      music_genres: [],
      vibe_tags: [],
      social_anxiety: 'none',
      preferred_budget: 'moderate',
      total_meetups_attended: 0,
    });

  if (profileError) {
    console.error('Error creating default profile:', profileError);
    // Don't throw - user was created successfully
  }

  console.log(`✅ Created new user: ${newUser.id} (${phoneNumber})`);
  return newUser;
}

/**
 * Get a user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get user: ${error.message}`);
  }

  return data;
}

/**
 * Get a user by phone number
 */
export async function getUserByPhone(phoneNumber: string): Promise<User | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get user: ${error.message}`);
  }

  return data;
}

/**
 * Get user profile with all preferences
 */
export async function getUserProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get profile: ${error.message}`);
  }

  return data;
}

/**
 * Get user with their profile in one query
 */
export async function getUserWithProfile(userId: string): Promise<UserWithProfile | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get user with profile: ${error.message}`);
  }

  return {
    ...data,
    profile: data.profile?.[0] || null,
  };
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string, 
  updates: UpdateProfileInput
): Promise<Profile> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  console.log(`✅ Updated profile for user: ${userId}`);
  return data;
}

/**
 * Add new vibe tags from reflection (without removing existing ones)
 */
export async function updateVibeTagsFromReflection(
  userId: string, 
  newTags: VibeTag[]
): Promise<Profile> {
  const supabase = getSupabaseClient();
  
  // Get current profile
  const currentProfile = await getUserProfile(userId);
  if (!currentProfile) {
    throw new Error(`Profile not found for user: ${userId}`);
  }

  // Merge tags (avoid duplicates)
  const existingTags = new Set(currentProfile.vibe_tags || []);
  newTags.forEach(tag => existingTags.add(tag));
  const mergedTags = Array.from(existingTags) as VibeTag[];

  // Update profile
  const { data, error } = await supabase
    .from('profiles')
    .update({ vibe_tags: mergedTags })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update vibe tags: ${error.message}`);
  }

  console.log(`✅ Updated vibe tags for user ${userId}: ${mergedTags.join(', ')}`);
  return data;
}

/**
 * Increment meetups attended count
 */
export async function incrementMeetupsAttended(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase.rpc('increment_meetups_attended', { 
    p_user_id: userId 
  });

  if (error) {
    // Fallback to manual increment if RPC doesn't exist
    const profile = await getUserProfile(userId);
    if (profile) {
      await supabase
        .from('profiles')
        .update({ 
          total_meetups_attended: (profile.total_meetups_attended || 0) + 1 
        })
        .eq('user_id', userId);
    }
  }
}

/**
 * Deactivate a user
 */
export async function deactivateUser(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to deactivate user: ${error.message}`);
  }

  console.log(`✅ Deactivated user: ${userId}`);
}
