/**
 * Meetup Service
 * Handles Meetup CRUD + participant management
 */

import { getSupabaseClient } from '../config/supabase';
import { 
  Meetup, 
  MeetupParticipant,
  MeetupWithDetails,
  MeetupStatus,
  CreateMeetupInput
} from '../types/database';

/**
 * Create a new meetup and add initiator as first participant
 */
export async function createMeetup(
  initiatorId: string,
  data: CreateMeetupInput
): Promise<Meetup> {
  const supabase = getSupabaseClient();
  
  // Create the meetup
  const { data: meetup, error: meetupError } = await supabase
    .from('meetups')
    .insert({
      initiator_id: initiatorId,
      spot_id: data.spot_id || null,
      title: data.title,
      description: data.description || null,
      intent: data.intent || null,
      scheduled_time: data.scheduled_time,
      max_participants: data.max_participants || 10,
      status: 'proposed',
      search_query: data.search_query || null,
      search_filters: data.search_filters || null,
      oracle_reasoning: data.oracle_reasoning || null,
    })
    .select()
    .single();

  if (meetupError) {
    throw new Error(`Failed to create meetup: ${meetupError.message}`);
  }

  // Add initiator as first participant
  const { error: participantError } = await supabase
    .from('meetup_participants')
    .insert({
      meetup_id: meetup.id,
      user_id: initiatorId,
      confirmed_at: new Date().toISOString(), // Initiator is auto-confirmed
    });

  if (participantError) {
    console.error('Error adding initiator as participant:', participantError);
    // Don't fail the whole operation
  }

  console.log(`✅ Created meetup: ${meetup.title} (${meetup.id})`);
  return meetup;
}

/**
 * Get a meetup by ID
 */
export async function getMeetupById(meetupId: string): Promise<Meetup | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('meetups')
    .select('*')
    .eq('id', meetupId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get meetup: ${error.message}`);
  }

  return data;
}

/**
 * Get meetup with all details (spot, participants, initiator)
 */
export async function getMeetupWithDetails(
  meetupId: string
): Promise<MeetupWithDetails | null> {
  const supabase = getSupabaseClient();
  
  const { data: meetup, error } = await supabase
    .from('meetups')
    .select(`
      *,
      spot:series_spots(*),
      participants:meetup_participants(*),
      initiator:users!initiator_id(*)
    `)
    .eq('id', meetupId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get meetup details: ${error.message}`);
  }

  return {
    ...meetup,
    spot: meetup.spot || null,
    participants: meetup.participants || [],
    initiator: meetup.initiator,
  };
}

/**
 * Add a participant to a meetup
 */
export async function addParticipant(
  meetupId: string,
  userId: string
): Promise<MeetupParticipant> {
  const supabase = getSupabaseClient();
  
  // Check if already a participant
  const { data: existing } = await supabase
    .from('meetup_participants')
    .select('*')
    .eq('meetup_id', meetupId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    return existing;
  }

  // Check meetup capacity
  const meetup = await getMeetupById(meetupId);
  if (!meetup) {
    throw new Error(`Meetup not found: ${meetupId}`);
  }

  const { count: currentParticipants } = await supabase
    .from('meetup_participants')
    .select('*', { count: 'exact', head: true })
    .eq('meetup_id', meetupId);

  if (currentParticipants && currentParticipants >= meetup.max_participants) {
    throw new Error('Meetup is full');
  }

  // Add participant
  const { data, error } = await supabase
    .from('meetup_participants')
    .insert({
      meetup_id: meetupId,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add participant: ${error.message}`);
  }

  console.log(`✅ Added participant ${userId} to meetup ${meetupId}`);
  return data;
}

/**
 * Confirm a participant's attendance
 */
export async function confirmParticipant(
  meetupId: string,
  userId: string
): Promise<MeetupParticipant> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('meetup_participants')
    .update({ confirmed_at: new Date().toISOString() })
    .eq('meetup_id', meetupId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to confirm participant: ${error.message}`);
  }

  return data;
}

/**
 * Remove a participant from a meetup
 */
export async function removeParticipant(
  meetupId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('meetup_participants')
    .delete()
    .eq('meetup_id', meetupId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to remove participant: ${error.message}`);
  }

  console.log(`✅ Removed participant ${userId} from meetup ${meetupId}`);
}

/**
 * Update meetup status
 */
export async function updateMeetupStatus(
  meetupId: string,
  status: MeetupStatus
): Promise<Meetup> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('meetups')
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', meetupId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update meetup status: ${error.message}`);
  }

  console.log(`✅ Updated meetup ${meetupId} status to: ${status}`);
  return data;
}

/**
 * Mark participants as attended
 */
export async function markAttendance(
  meetupId: string,
  userIds: string[],
  attended: boolean = true
): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('meetup_participants')
    .update({ attended })
    .eq('meetup_id', meetupId)
    .in('user_id', userIds);

  if (error) {
    throw new Error(`Failed to mark attendance: ${error.message}`);
  }
}

/**
 * Get upcoming meetups for a user
 */
export async function getUpcomingMeetups(
  userId: string,
  limit: number = 10
): Promise<Meetup[]> {
  const supabase = getSupabaseClient();
  
  const now = new Date().toISOString();
  
  // Get meetups where user is a participant
  const { data: participations } = await supabase
    .from('meetup_participants')
    .select('meetup_id')
    .eq('user_id', userId);

  if (!participations || participations.length === 0) {
    return [];
  }

  const meetupIds = participations.map(p => p.meetup_id);

  const { data, error } = await supabase
    .from('meetups')
    .select('*')
    .in('id', meetupIds)
    .gte('scheduled_time', now)
    .in('status', ['pending', 'confirmed'])
    .order('scheduled_time', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get upcoming meetups: ${error.message}`);
  }

  return data || [];
}

/**
 * Get past meetups for a user
 */
export async function getPastMeetups(
  userId: string,
  limit: number = 10
): Promise<Meetup[]> {
  const supabase = getSupabaseClient();
  
  const now = new Date().toISOString();
  
  const { data: participations } = await supabase
    .from('meetup_participants')
    .select('meetup_id')
    .eq('user_id', userId);

  if (!participations || participations.length === 0) {
    return [];
  }

  const meetupIds = participations.map(p => p.meetup_id);

  const { data, error } = await supabase
    .from('meetups')
    .select('*')
    .in('id', meetupIds)
    .or(`scheduled_time.lt.${now},status.eq.completed`)
    .order('scheduled_time', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get past meetups: ${error.message}`);
  }

  return data || [];
}

/**
 * Get completed meetups that need reflection/review
 */
export async function getMeetupsNeedingReflection(
  userId: string
): Promise<Meetup[]> {
  const supabase = getSupabaseClient();
  
  // Get user's completed meetups
  const { data: participations } = await supabase
    .from('meetup_participants')
    .select('meetup_id')
    .eq('user_id', userId)
    .eq('attended', true);

  if (!participations || participations.length === 0) {
    return [];
  }

  const meetupIds = participations.map(p => p.meetup_id);

  // Get meetups that are completed
  const { data: completedMeetups, error: meetupError } = await supabase
    .from('meetups')
    .select('*')
    .in('id', meetupIds)
    .eq('status', 'completed');

  if (meetupError) {
    throw new Error(`Failed to get completed meetups: ${meetupError.message}`);
  }

  if (!completedMeetups || completedMeetups.length === 0) {
    return [];
  }

  // Check which ones have reviews
  const { data: reviews } = await supabase
    .from('hangout_reviews')
    .select('meetup_id')
    .eq('user_id', userId)
    .in('meetup_id', completedMeetups.map(m => m.id));

  const reviewedMeetupIds = new Set((reviews || []).map(r => r.meetup_id));

  // Return meetups without reviews
  return completedMeetups.filter(m => !reviewedMeetupIds.has(m.id));
}

/**
 * Get meetup participants
 */
export async function getMeetupParticipants(
  meetupId: string
): Promise<MeetupParticipant[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('meetup_participants')
    .select('*')
    .eq('meetup_id', meetupId)
    .order('joined_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get participants: ${error.message}`);
  }

  return data || [];
}

/**
 * Cancel a meetup
 */
export async function cancelMeetup(meetupId: string): Promise<Meetup> {
  return updateMeetupStatus(meetupId, 'cancelled');
}

/**
 * Complete a meetup
 */
export async function completeMeetup(meetupId: string): Promise<Meetup> {
  return updateMeetupStatus(meetupId, 'completed');
}
