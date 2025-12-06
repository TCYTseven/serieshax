"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase-client";
import { motion } from "framer-motion";
import ProfileMenu from "@/components/ProfileMenu";

interface ProfileData {
  display_name: string | null;
  age: number | null;
  city: string | null;
  location: string | null;
  phone_number: string | null;
  interests: string[] | null;
  goals: string[] | null;
  sports_teams: Record<string, string> | null;
  food_genres: string[] | null;
  music_genres: string[] | null;
  socialbility: number | null;
  vibe_tags: string[] | null;
  group_size_preference: number | null;
  preferred_budget: string | null;
  total_meetups_attended: number | null;
  avg_rating_given: number | null;
  avg_rating_received: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
      return;
    }

    if (user) {
      loadProfileData();
    }
  }, [user, authLoading]);

  const loadProfileData = async () => {
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          setError("No profile found. Please complete onboarding.");
        } else {
          setError("Failed to load profile data.");
        }
      } else {
        setProfileData(data);
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      setError("An error occurred while loading your profile.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/50 text-sm font-light">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-[#0084ff]/3 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#0084ff]/3 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 132, 255, 0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(0, 132, 255, 0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Profile Menu - Top Left */}
      <div className="absolute top-6 left-6 z-50">
        <ProfileMenu />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-12"
        >
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-light text-white tracking-tight">
              Settings
            </h1>
            <p className="text-white/40 text-sm font-light">
              View your account information and preferences
            </p>
          </div>

          {error ? (
            <div className="text-red-400 text-sm font-light">{error}</div>
          ) : profileData ? (
            <div className="space-y-8">
              {/* Account Information */}
              <section className="space-y-6">
                <div className="w-12 h-px bg-[#0084ff]" />
                <h2 className="text-xl font-light text-white tracking-tight uppercase text-xs">
                  Account Information
                </h2>
                <div className="space-y-4">
                  <div className="border-b border-white/10 pb-4">
                    <label className="text-xs text-white/40 uppercase tracking-wider font-light block mb-2">
                      Email
                    </label>
                    <p className="text-white font-light">{user.email}</p>
                  </div>
                  <div className="border-b border-white/10 pb-4">
                    <label className="text-xs text-white/40 uppercase tracking-wider font-light block mb-2">
                      User ID
                    </label>
                    <p className="text-white font-light text-sm font-mono">
                      {user.id}
                    </p>
                  </div>
                  <div className="border-b border-white/10 pb-4">
                    <label className="text-xs text-white/40 uppercase tracking-wider font-light block mb-2">
                      Account Created
                    </label>
                    <p className="text-white font-light">
                      {formatDate(user.created_at)}
                    </p>
                  </div>
                </div>
              </section>

              {/* Personal Information */}
              <section className="space-y-6">
                <div className="w-12 h-px bg-[#0084ff]" />
                <h2 className="text-xl font-light text-white tracking-tight uppercase text-xs">
                  Personal Information
                </h2>
                <div className="space-y-4">
                  <div className="border-b border-white/10 pb-4">
                    <label className="text-xs text-white/40 uppercase tracking-wider font-light block mb-2">
                      Name
                    </label>
                    <p className="text-white font-light">
                      {profileData.display_name || "Not set"}
                    </p>
                  </div>
                  <div className="border-b border-white/10 pb-4">
                    <label className="text-xs text-white/40 uppercase tracking-wider font-light block mb-2">
                      Age
                    </label>
                    <p className="text-white font-light">
                      {profileData.age || "Not set"}
                    </p>
                  </div>
                  <div className="border-b border-white/10 pb-4">
                    <label className="text-xs text-white/40 uppercase tracking-wider font-light block mb-2">
                      Phone Number
                    </label>
                    <p className="text-white font-light">
                      {profileData.phone_number || "Not set"}
                    </p>
                  </div>
                  <div className="border-b border-white/10 pb-4">
                    <label className="text-xs text-white/40 uppercase tracking-wider font-light block mb-2">
                      Location
                    </label>
                    <p className="text-white font-light">
                      {profileData.location || profileData.city || "Not set"}
                    </p>
                  </div>
                  <div className="border-b border-white/10 pb-4">
                    <label className="text-xs text-white/40 uppercase tracking-wider font-light block mb-2">
                      Socialbility
                    </label>
                    <p className="text-white font-light">
                      {profileData.socialbility
                        ? `${profileData.socialbility}/10`
                        : "Not set"}
                    </p>
                  </div>
                </div>
              </section>

              {/* Interests & Preferences */}
              <section className="space-y-6">
                <div className="w-12 h-px bg-[#0084ff]" />
                <h2 className="text-xl font-light text-white tracking-tight uppercase text-xs">
                  Interests & Preferences
                </h2>
                <div className="space-y-4">
                  <div className="border-b border-white/10 pb-4">
                    <label className="text-xs text-white/40 uppercase tracking-wider font-light block mb-2">
                      Interests
                    </label>
                    <p className="text-white font-light">
                      {profileData.interests && profileData.interests.length > 0
                        ? profileData.interests.join(", ")
                        : "Not set"}
                    </p>
                  </div>
                  <div className="border-b border-white/10 pb-4">
                    <label className="text-xs text-white/40 uppercase tracking-wider font-light block mb-2">
                      Goals
                    </label>
                    <p className="text-white font-light">
                      {profileData.goals && profileData.goals.length > 0
                        ? profileData.goals.join(", ")
                        : "Not set"}
                    </p>
                  </div>
                  <div className="border-b border-white/10 pb-4">
                    <label className="text-xs text-white/40 uppercase tracking-wider font-light block mb-2">
                      Vibe Tags
                    </label>
                    <p className="text-white font-light">
                      {profileData.vibe_tags && profileData.vibe_tags.length > 0
                        ? profileData.vibe_tags.join(", ")
                        : "Not set"}
                    </p>
                  </div>
                  {profileData.sports_teams &&
                    Object.keys(profileData.sports_teams).length > 0 && (
                      <div className="border-b border-white/10 pb-4">
                        <label className="text-xs text-white/40 uppercase tracking-wider font-light block mb-2">
                          Sports Teams
                        </label>
                        <div className="space-y-1">
                          {Object.entries(profileData.sports_teams).map(
                            ([sport, team]) => (
                              <p key={sport} className="text-white font-light">
                                {sport}: {team}
                              </p>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  {profileData.food_genres &&
                    profileData.food_genres.length > 0 && (
                      <div className="border-b border-white/10 pb-4">
                        <label className="text-xs text-white/40 uppercase tracking-wider font-light block mb-2">
                          Food Genres
                        </label>
                        <p className="text-white font-light">
                          {profileData.food_genres.join(", ")}
                        </p>
                      </div>
                    )}
                  {profileData.music_genres &&
                    profileData.music_genres.length > 0 && (
                      <div className="border-b border-white/10 pb-4">
                        <label className="text-xs text-white/40 uppercase tracking-wider font-light block mb-2">
                          Music Genres
                        </label>
                        <p className="text-white font-light">
                          {profileData.music_genres.join(", ")}
                        </p>
                      </div>
                    )}
                </div>
              </section>

              {/* Activity Stats */}
              <section className="space-y-6">
                <div className="w-12 h-px bg-[#0084ff]" />
                <h2 className="text-xl font-light text-white tracking-tight uppercase text-xs">
                  Activity
                </h2>
                <div className="space-y-4">
                  <div className="border-b border-white/10 pb-4">
                    <label className="text-xs text-white/40 uppercase tracking-wider font-light block mb-2">
                      Total Meetups Attended
                    </label>
                    <p className="text-white font-light">
                      {profileData.total_meetups_attended ?? "0"}
                    </p>
                  </div>
                  <div className="border-b border-white/10 pb-4">
                    <label className="text-xs text-white/40 uppercase tracking-wider font-light block mb-2">
                      Average Rating Given
                    </label>
                    <p className="text-white font-light">
                      {profileData.avg_rating_given
                        ? profileData.avg_rating_given.toFixed(1)
                        : "N/A"}
                    </p>
                  </div>
                  <div className="border-b border-white/10 pb-4">
                    <label className="text-xs text-white/40 uppercase tracking-wider font-light block mb-2">
                      Average Rating Received
                    </label>
                    <p className="text-white font-light">
                      {profileData.avg_rating_received
                        ? profileData.avg_rating_received.toFixed(1)
                        : "N/A"}
                    </p>
                  </div>
                  <div className="border-b border-white/10 pb-4">
                    <label className="text-xs text-white/40 uppercase tracking-wider font-light block mb-2">
                      Profile Last Updated
                    </label>
                    <p className="text-white font-light">
                      {formatDate(profileData.updated_at)}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="text-white/50 text-sm font-light">
              No profile data available.
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

