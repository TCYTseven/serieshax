"use client";

import { useOnboarding } from "@/contexts/OnboardingContext";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import MainScreen from "@/components/MainScreen";

export default function Home() {
  const { isCompleted } = useOnboarding();

  if (!isCompleted) {
    return <OnboardingFlow />;
  }

  return <MainScreen />;
}

