import { createClient } from "./supabase-client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { OnboardingData } from "@/contexts/OnboardingContext";

// Map our vibe tags to the database enum values
const vibeTagMapping: Record<string, string> = {
  "Adventurous": "adventurous",
  "Chill": "chill",
  "Energetic": "energetic",
  "Thoughtful": "intellectual", // Map thoughtful to intellectual
  "Spontaneous": "adventurous", // Map spontaneous to adventurous
  "Open-minded": "chill", // Map open-minded to chill
  "Selective": "introvert_friendly", // Map selective to introvert_friendly
  "Intellectual": "intellectual",
};

export async function saveOnboardingToSupabase(
  authUserId: string,
  onboardingData: OnboardingData,
  supabaseClient?: ReturnType<typeof createClient>
) {
  const supabase = supabaseClient || createClient();

  // First, ensure user exists in users table (link auth.users.id to public.users.id)
  const { error: userError } = await supabase
    .from("users")
    .upsert(
      {
        id: authUserId, // Use auth user ID as the primary key
        series_user_id: authUserId, // Use auth user ID as series_user_id
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      }
    );

  if (userError) {
    console.error("Error creating/updating user:", userError);
    throw userError;
  }

  // Map vibe tags to enum values
  const mappedVibeTags = onboardingData.vibeTags
    .map((tag) => vibeTagMapping[tag])
    .filter((tag) => tag !== undefined);

  // Extract city from location (e.g., "New York, United States" -> "New York")
  const city = onboardingData.location
    ? onboardingData.location.split(",")[0].trim()
    : null;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: authUserId,
        display_name: onboardingData.name,
        age: onboardingData.age ? parseInt(onboardingData.age) : null,
        city: city,
        location: onboardingData.location,
        interests: onboardingData.interests,
        goals: onboardingData.goals,
        sports_teams: onboardingData.sportsTeams,
        food_genres: onboardingData.foodGenres,
        music_genres: onboardingData.musicGenres,
        socialbility: onboardingData.socialbility,
        vibe_tags: mappedVibeTags.length > 0 ? mappedVibeTags : null,
        // These fields should be NULL for now as requested
        group_size_preference: null,
        preferred_budget: null,
        total_meetups_attended: null,
        avg_rating_given: null,
        avg_rating_received: null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Error saving onboarding data:", error);
    throw error;
  }

  return data;
}

export async function getOnboardingFromSupabase(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No profile found
      return null;
    }
    console.error("Error fetching onboarding data:", error);
    throw error;
  }

  return data;
}

