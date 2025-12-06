"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useOnboarding } from "@/contexts/OnboardingContext";
import EventResults from "@/components/EventResults";

function EventResultsContent() {
  const searchParams = useSearchParams();
  const { data } = useOnboarding();

  const query = searchParams.get("query") || "";
  const people = searchParams.get("people") || "1";
  const location = searchParams.get("location") || "";
  const budget = searchParams.get("budget") || "";
  const trending = searchParams.get("trending") === "true";
  const gems = searchParams.get("gems") === "true";

  return (
    <EventResults
      searchQuery={query}
      filters={{
        people,
        location,
        budget,
        trendingTopics: trending,
        secretGems: gems,
      }}
      onboardingData={data}
    />
  );
}

export default function EventResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/50">Loading...</p>
      </div>
    }>
      <EventResultsContent />
    </Suspense>
  );
}

