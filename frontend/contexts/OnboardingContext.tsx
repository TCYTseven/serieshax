"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";
import { saveOnboardingToSupabase, getOnboardingFromSupabase } from "@/lib/onboarding-service";

export interface OnboardingData {
  name: string;
  age: string;
  location: string;
  interests: string[];
  goals: string[];
  sportsTeams: Record<string, string>; // sport -> team name
  foodGenres: string[]; // food genres
  musicGenres: string[]; // music genres
  socialbility: number; // 1-10 rating
  vibeTags: string[]; // vibe tags like "outgoing", "introverted", etc.
}

interface OnboardingContextType {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  isCompleted: boolean;
  isLoading: boolean;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => void;
}

const defaultData: OnboardingData = {
  name: "",
  age: "",
  location: "",
  interests: [],
  goals: [],
  sportsTeams: {},
  foodGenres: [],
  musicGenres: [],
  socialbility: 5, // Default to middle
  vibeTags: [],
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined,
);

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [data, setData] = useState<OnboardingData>(defaultData);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const loadOnboardingData = async () => {
      try {
        // Check Supabase auth first
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // User is logged in, try to load from Supabase
          const profileData = await getOnboardingFromSupabase(user.id);
          if (profileData) {
            // Map Supabase data back to OnboardingData format
            const mappedData: OnboardingData = {
              name: profileData.display_name || "",
              age: profileData.age?.toString() || "",
              location: profileData.location || profileData.city || "",
              interests: profileData.interests || [],
              goals: profileData.goals || [],
              sportsTeams: profileData.sports_teams || {},
              foodGenres: profileData.food_genres || [],
              musicGenres: profileData.music_genres || [],
              socialbility: profileData.socialbility || 5,
              vibeTags: profileData.vibe_tags || [],
            };
            setData(mappedData);
            setIsCompleted(true);
            setIsLoading(false);
            return;
          }
        }

        // Fallback to localStorage if no Supabase data
        const completed = localStorage.getItem("onboarding_completed") === "true";
        const savedData = localStorage.getItem("onboarding_data");
        if (completed && savedData) {
          try {
            setData(JSON.parse(savedData));
            setIsCompleted(true);
          } catch (e) {
            // Invalid data, reset
          }
        }
      } catch (error) {
        console.error("Error loading onboarding data:", error);
        // Fallback to localStorage
        const completed = localStorage.getItem("onboarding_completed") === "true";
        const savedData = localStorage.getItem("onboarding_data");
        if (completed && savedData) {
          try {
            setData(JSON.parse(savedData));
            setIsCompleted(true);
          } catch (e) {
            // Invalid data, reset
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadOnboardingData();
  }, []);

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => {
      const newData = { ...prev, ...updates };
      localStorage.setItem("onboarding_data", JSON.stringify(newData));
      return newData;
    });
  };

  const completeOnboarding = async () => {
    setIsCompleted(true);
    localStorage.setItem("onboarding_completed", "true");
    localStorage.setItem("onboarding_data", JSON.stringify(data));

    // Save to Supabase if user is authenticated
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await saveOnboardingToSupabase(user.id, data);
      }
    } catch (error) {
      console.error("Error saving onboarding to Supabase:", error);
      // Continue even if Supabase save fails - localStorage is already saved
    }
  };

  const resetOnboarding = () => {
    setIsCompleted(false);
    setData(defaultData);
    localStorage.removeItem("onboarding_completed");
    localStorage.removeItem("onboarding_data");
  };

  return (
    <OnboardingContext.Provider
      value={{
        data,
        updateData,
        isCompleted,
        isLoading,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}

