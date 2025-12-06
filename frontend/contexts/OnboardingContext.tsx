"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface OnboardingData {
  name: string;
  age: string;
  location: string;
  interests: string[];
  goals: string[];
  sportsTeams: Record<string, string>; // sport -> team name
  foodGenres: string[]; // food genres
  musicGenres: string[]; // music genres
}

interface OnboardingContextType {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  isCompleted: boolean;
  completeOnboarding: () => void;
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

  useEffect(() => {
    // Check if onboarding was already completed
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
  }, []);

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => {
      const newData = { ...prev, ...updates };
      localStorage.setItem("onboarding_data", JSON.stringify(newData));
      return newData;
    });
  };

  const completeOnboarding = () => {
    setIsCompleted(true);
    localStorage.setItem("onboarding_completed", "true");
    localStorage.setItem("onboarding_data", JSON.stringify(data));
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

